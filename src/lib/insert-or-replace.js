const mime = require('mime-types');
const log = require('./log');

const MAX_RETRY = 3;

const getDoc = async (db, docId) => {
  try {
    return await db.get(docId);
  } catch (e) {
    if (e.status === 404) {
      return null; // Document doesn't exist
    }
    throw e;
  }
};

const putDoc = async (db, doc, existingRev = null) => {
  const docToSave = { ...doc };
  if (existingRev) {
    docToSave._rev = existingRev;
  } else {
    delete docToSave._rev; // Ensure no _rev for new documents
  }
  return await db.put(docToSave);
};

const addDocAttachment = async (db, docId, attachmentName, attachment, currentRev, retries = MAX_RETRY) => {
  if (retries < 0) {
    throw new Error(`Failed to add attachment ${attachmentName} to ${docId} after retries`);
  }

  // Check for document existence before attempting attachment
  const latestDoc = await getDoc(db, docId);
  if (!latestDoc) {
    throw new Error(`Document ${docId} not found before adding attachment ${attachmentName}`);
  }
  const revToUse = latestDoc._rev || currentRev;

  try {
    const contentType = attachment.content_type || mime.lookup(attachmentName) || 'application/octet-stream';
    const result = await db.putAttachment(docId, attachmentName, revToUse, attachment.data, contentType);
    log.info(`Added attachment ${attachmentName} to ${docId}`);
    return result;
  } catch (err) {
    if (err.status === 409) {
      log.info(`Attachment conflict for ${attachmentName} in ${docId}, retrying`);
      return addDocAttachment(db, docId, attachmentName, attachment, revToUse, retries - 1);
    }
    throw err;
  }
};

const handleAttachments = async (db, docId, attachments, initialRev) => {
  let currentRev = initialRev;
  for (const attachmentName of Object.keys(attachments)) {
    const result = await addDocAttachment(db, docId, attachmentName, attachments[attachmentName], currentRev);
    currentRev = result.rev; // Update rev for next attachment
  }
  return currentRev;
};

const handleLargeDocument = async (db, doc, retries = MAX_RETRY) => {
  if (retries < 0) {
    throw new Error(`Large document update failed for ${doc._id} after retries`);
  }

  try {
    const attachments = doc._attachments || {};
    // Regex for specific functional files: form.xml, model.xml, form.html
    const functionalRegex = /^(form|model)\.xml$|^form\.html$/i;

    // Separate functional vs media attachments
    const functionalAttachments = {};
    const mediaAttachments = {};
    for (const [name, value] of Object.entries(attachments)) {
      if (functionalRegex.test(name)) {
        functionalAttachments[name] = value;
      } else {
        if (value.data) { // Validate attachment has data
          mediaAttachments[name] = value;
        } else {
          log.warn(`Skipping invalid attachment ${name} for ${doc._id}: missing data`);
        }
      }
    }

    // Prepare doc with only functional attachments
    const docToSave = { ...doc, _attachments: functionalAttachments };
    if (Object.keys(docToSave._attachments).length === 0) {
      delete docToSave._attachments; 
    }

    const existingDoc = await getDoc(db, doc._id);
    log.info(
      existingDoc
        ? `Got latest rev for ${doc._id}: ${existingDoc._rev}`
        : `Document ${doc._id} does not exist, creating new`
    );

    log.info(`Attempting to save ${doc._id}`);
    const res = await putDoc(db, docToSave, existingDoc ? existingDoc._rev : null);
    log.info(`Successfully saved ${doc._id}, new rev: ${res.rev}`);

    // Upload media attachments separately
    if (Object.keys(mediaAttachments).length > 0) {
      log.info(`Processing ${Object.keys(mediaAttachments).length} media attachments for ${doc._id}`);
      await handleAttachments(db, doc._id, mediaAttachments, res.rev);
    }

    return res;
  } catch (err) {
    if (err.status === 409) {
      log.info(`Large document conflict detected for ${doc._id}, retrying`);
      return handleLargeDocument(db, doc, retries - 1);
    }
    log.error(`Non-conflict error for ${doc._id}: ${err.message}`);
    throw err;
  }
};


const upsertDoc = async (db, doc, retries = MAX_RETRY) => {
  if (retries < 0) {
    throw new Error(`Document update failed for ${doc._id} after retries due to conflicts`);
  }

  try {
    const existingDoc = await getDoc(db, doc._id);
    const result = await putDoc(db, doc, existingDoc ? existingDoc._rev : null);
    return result;
  } catch (err) {
    if (err.status === 409) {
      log.info(`Conflict detected for ${doc._id}, retrying`);
      return upsertDoc(db, doc, retries - 1);
    } else if (err.status === 413) {
      return handleLargeDocument(db, doc);
    }
    throw err;
  }
};

module.exports = upsertDoc;
