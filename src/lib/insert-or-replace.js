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

  try {
    const contentType = attachment.content_type || mime.lookup(attachmentName) || 'application/octet-stream';
    const result = await db.putAttachment(docId, attachmentName, currentRev, attachment.data, contentType);
    log.info(`Added attachment ${attachmentName} to ${docId}`);
    return result;
  } catch (err) {
    if (err.status === 409) {
      log.info(`Attachment conflict for ${attachmentName} in ${docId}, retrying`);
      const latestDoc = await getDoc(db, docId);
      if (!latestDoc) {
        throw new Error(`Document ${docId} not found during attachment retry`);
      }
      return addDocAttachment(db, docId, attachmentName, attachment, latestDoc._rev, retries - 1);
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
    const attachments = doc._attachments;
    const docWithoutAttachments = { ...doc };
    delete docWithoutAttachments._attachments;

    const existingDoc = await getDoc(db, doc._id);
    log.info(existingDoc ? `Got latest rev for ${doc._id}: ${existingDoc._rev}` :
      `Document ${doc._id} does not exist, creating new`);

    log.info(`Attempting to save ${doc._id}`);
    const res = await putDoc(db, docWithoutAttachments, existingDoc ? existingDoc._rev : null);
    log.info(`Successfully saved ${doc._id}, new rev: ${res.rev}`);

    if (attachments && Object.keys(attachments).length > 0) {
      log.info(`Processing ${Object.keys(attachments).length} attachments for ${doc._id}`);
      await handleAttachments(db, doc._id, attachments, res.rev);
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
