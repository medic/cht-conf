const mime = require('mime-types');

const upsertDoc = async (db, doc, maxRetries = 3, retryDelay = 100) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      // Fetch the latest _rev on each attempt
      try {
        const existingDoc = await db.get(doc._id);
        // Creating a copy to avoid mutating the original doc
        const docToSave = { ...doc, _rev: existingDoc._rev };
        const result = await db.put(docToSave);
        return result;
      } catch (e) {
        if (e.status === 404) {
          // Document doesn't exist, try to create it
          const docToSave = { ...doc };
          delete docToSave._rev; // Remove _rev for new documents
          const result = await db.put(docToSave);
          return result;
        } else {
          throw e;
        }
      }

    } catch (err) {
      if (err.status === 409) {
        // Conflict - document was updated by another process
        attempts++;
        if (attempts >= maxRetries) {
          throw new Error(`Document update failed after ${maxRetries} attempts due to conflicts.
             Last error: ${err.message}`);
        }
        
        console.log(`Conflict detected, retrying attempt ${attempts}/${maxRetries}`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1)));
        continue;
        
      } else if (err.status === 413) {
        // Document too large - handle attachments separately
        return handleLargeDocument(db, doc, maxRetries, retryDelay);
        
      } else {
        throw err;
      }
    }
  }
};

const handleLargeDocument = async (db, doc, maxRetries = 5, retryDelay = 200) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      // Backup attachments
      const attachments = doc._attachments;
      const docWithoutAttachments = { ...doc };
      delete docWithoutAttachments._attachments;

      // Get the very latest document state
      let currentRev = null;
      try {
        const existingDoc = await db.get(doc._id, { latest: true });
        currentRev = existingDoc._rev;
        docWithoutAttachments._rev = currentRev;
        console.log(`Got latest rev for ${doc._id}: ${currentRev}`);
      } catch (e) {
        if (e.status !== 404) {
          throw e;
        }
        delete docWithoutAttachments._rev;
        console.log(`Document ${doc._id} does not exist, creating new`);
      }

      // Try to save the document without attachments
      console.log(`Attempting to save ${doc._id} (attempt ${attempts + 1}/${maxRetries})`);
      const res = await db.put(docWithoutAttachments);
      console.log(`Successfully saved ${doc._id}, new rev: ${res.rev}`);
      
      // Handle attachments one by one with individual error handling
      if (attachments && Object.keys(attachments).length > 0) {
        console.log(`Processing ${Object.keys(attachments).length} attachments for ${doc._id}`);
        
        let currentDocRev = res.rev;
        for (const attachmentName of Object.keys(attachments)) {
          try {
            const att = attachments[attachmentName];
            const contentType = att.content_type || mime.lookup(attachmentName) || 'application/octet-stream';
            
            const attachResult = await db.putAttachment(doc._id, attachmentName, currentDocRev, att.data, contentType);
            currentDocRev = attachResult.rev; // Update rev for next attachment
            console.log(`Added attachment ${attachmentName} to ${doc._id}`);
          } catch (attachErr) {
            console.error(`Failed to add attachment ${attachmentName}:`, attachErr.message);
            if (attachErr.status === 409) {
              // Get the latest rev and retry this attachment
              const latestDoc = await db.get(doc._id);
              currentDocRev = latestDoc._rev;
              const att = attachments[attachmentName];
              const contentType = att.content_type || mime.lookup(attachmentName) || 'application/octet-stream';
              const attachResult = await db.putAttachment(doc._id, attachmentName, currentDocRev, 
                att.data, contentType);
              currentDocRev = attachResult.rev;
              console.log(`Retried and added attachment ${attachmentName} to ${doc._id}`);
            } else {
              throw attachErr;
            }
          }
        }
      }
      
      return res;
      
    } catch (err) {
      if (err.status === 409) {
        attempts++;
        if (attempts >= maxRetries) {
          console.error(`All retry attempts failed for ${doc._id}. Trying force save strategy...`);
          try {
            return await forceSaveDocument(db, doc);
          } catch (forceErr) {
            throw new Error(`Large document update failed after ${maxRetries} attempts and
               force save failed. Document ID: ${doc._id}. Last error: ${forceErr.message}`);
          }
        }
        
        console.log(`Large document conflict detected for ${doc._id}, retrying attempt ${attempts}/${maxRetries}`);
        // Increase delay progressively
        const delay = retryDelay * Math.pow(2, attempts - 1) + Math.random() * 100; // Add jitter
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        console.error(`Non-conflict error for ${doc._id}:`, err.message);
        throw err;
      }
    }
  }
};

const forceSaveDocument = async (db, doc) => {
  console.log(`Attempting force save for ${doc._id}`);
  
  // Remove attachments temporarily and create a clean document
  const attachments = doc._attachments;
  const cleanDoc = { ...doc };
  delete cleanDoc._attachments;
  delete cleanDoc._rev; // Remove rev entirely to force creation of new document
  
  try {
    // Try to delete the existing problematic document
    try {
      const existingDoc = await db.get(doc._id);
      await db.remove(existingDoc._id, existingDoc._rev);
      console.log(`Removed existing conflicted document ${doc._id}`);
    } catch (deleteErr) {
      if (deleteErr.status !== 404) {
        console.log(`Could not delete existing document: ${deleteErr.message}`);
      }
    }
    
    // Try to PUT the clean document
    const result = await db.put(cleanDoc);
    console.log(`Force saved ${doc._id} with rev: ${result.rev}`);
    
    // Add attachments back if they exist
    if (attachments && Object.keys(attachments).length > 0) {
      console.log(`Adding ${Object.keys(attachments).length} attachments to force-saved document`);
      let currentRev = result.rev;
      
      for (const attachmentName of Object.keys(attachments)) {
        const att = attachments[attachmentName];
        const contentType = att.content_type || mime.lookup(attachmentName) || 'application/octet-stream';
        
        const attachResult = await db.putAttachment(result.id, attachmentName, currentRev, att.data, contentType);
        currentRev = attachResult.rev;
        console.log(`Added attachment ${attachmentName} to force-saved document`);
      }
    }
    
    return result;
  } catch (err) {
    console.error(`Force save failed for ${doc._id}:`, err.message);
    throw err;
  }
};

module.exports = upsertDoc;
