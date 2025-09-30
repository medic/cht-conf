const mime = require('mime-types');
const log = require('./log');

const MAX_RETRY = 3;

const mimeCache = new Map();
const getContentType = (attachmentName, attachment) => {
  if (attachment.content_type) {return attachment.content_type;}
  if (mimeCache.has(attachmentName)) {return mimeCache.get(attachmentName);}
  const contentType = mime.lookup(attachmentName) || 'application/octet-stream';
  mimeCache.set(attachmentName, contentType);
  return contentType;
};

const getDoc = async (db, docId) => {
  if (!db || !docId) {throw new Error('Valid input is required');}
  try {
    return await db.get(docId);
  } catch (e) {
    if (e.status === 404) {
      return null;
    }
    throw e;
  }
};

const putDoc = async (db, doc, existingRev = null) => {
  if (!db || !doc) {throw new Error('Valid input is required');}
  if (existingRev) {
    doc._rev = existingRev;
  } else {
    delete doc._rev;
  }
  return await db.put(doc);
};

const addDocAttachment = async (db, options, retries = MAX_RETRY) => {
  if (!db || !options || !options.docId || !options.attachmentName || !options.attachment) {
    throw new Error('Valid input is required');
  }
  const { docId, attachmentName, attachment, currentRev } = options;

  if (retries < 0) {
    throw new Error(`Failed to add attachment ${attachmentName} to ${docId} after retries`);
  }

  try {
    const contentType = getContentType(attachmentName, attachment);
    const result = await db.putAttachment(docId, attachmentName, currentRev, attachment.data, contentType);
    return result;
  } catch (err) {
    if (err.status === 409) {
      const latestDoc = await getDoc(db, docId);
      if (!latestDoc) {
        throw new Error(`Document ${docId} not found before adding attachment ${attachmentName}`);
      }
      return addDocAttachment(db, { docId, attachmentName, attachment, currentRev: latestDoc._rev }, retries - 1);
    }
    throw err;
  }
};

const handleAttachments = async (db, docId, attachments, initialRev) => {
  if (!db || !docId || !attachments) {throw new Error('Valid input is required');}
  let currentRev = initialRev;
  const latestDoc = await getDoc(db, docId);
  if (!latestDoc) {
    throw new Error(`Document ${docId} not found`);
  }
  currentRev = latestDoc._rev || currentRev;

  for (const attachmentName of Object.keys(attachments)) {
    const result = await addDocAttachment(db, {
      docId,
      attachmentName,
      attachment: attachments[attachmentName],
      currentRev
    }, MAX_RETRY);
    currentRev = result.rev;
  }
  return currentRev;
};

const splitAttachments = (attachments, docId) => {
  if (!attachments) {
    return { functionalAttachments: {}, mediaAttachments: {} };
  }

  const functionalRegex = /^(form|model)\.xml$|^form\.html$|^xml$/i;
  const functionalAttachments = {};
  const mediaAttachments = {};

  for (const [name, value] of Object.entries(attachments)) {
    if (functionalRegex.test(name)) {
      functionalAttachments[name] = value;
    } else if (value?.data) {
      mediaAttachments[name] = value;
    } else {
      log.warn(`Skipping invalid attachment ${name} for ${docId}: missing data`);
    }
  }
  return { functionalAttachments, mediaAttachments };
};

const saveFunctionalDoc = async (db, doc, functionalAttachments, existingRev) => {
  if (!db || !doc || !doc._id) {throw new Error('Valid input is required');}
  const docToSave = {
    ...doc,
    ...(Object.keys(functionalAttachments).length > 0 && { _attachments: functionalAttachments })
  };
  return putDoc(db, docToSave, existingRev);
};

const saveMediaAttachments = async (db, docId, mediaAttachments, rev) => {
  if (Object.keys(mediaAttachments).length > 0) {
    await handleAttachments(db, docId, mediaAttachments, rev);
  }
};

const handleLargeDocument = async (db, doc, retries = MAX_RETRY) => {
  if (!db || !doc || !doc._id) {throw new Error('Valid input is required');}
  if (retries < 0) {
    throw new Error(`Large document update failed for ${doc._id} after retries`);
  }

  try {
    const { functionalAttachments, mediaAttachments } = splitAttachments(doc._attachments, doc._id);
    const latestDoc = await getDoc(db, doc._id);
    const res = await saveFunctionalDoc(db, doc, functionalAttachments, latestDoc ? latestDoc._rev : null);

    log.info(`Uploading ${doc._id}...`);

    await saveMediaAttachments(db, doc._id, mediaAttachments, res.rev);

    return res;
  } catch (err) {
    if (err.status === 409) {
      return handleLargeDocument(db, doc, retries - 1);
    }
    throw err;
  }
};

const handleUpsertError = async (db, doc, err, retries) => {
  if (err.status === 409) {
    return upsertDoc(db, doc, retries - 1);
  }
  if (err.status === 413) {
    return handleLargeDocument(db, doc);
  }
  throw err;
};

const upsertDoc = async (db, doc, retries = MAX_RETRY) => {
  if (!db || !doc || !doc._id) {throw new Error('Valid input is required');}
  if (retries < 0) {
    throw new Error(`Document update failed for ${doc._id} after retries due to conflicts`);
  }

  try {
    const existingDoc = await getDoc(db, doc._id);
    return await putDoc(db, doc, existingDoc ? existingDoc._rev : null);
  } catch (err) {
    return handleUpsertError(db, doc, err, retries);
  }
};

module.exports = upsertDoc;
