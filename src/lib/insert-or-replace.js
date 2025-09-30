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


const putDoc = async (db, doc, existingRev = null) => {
  if (existingRev) {
    doc._rev = existingRev;
  } else {
    delete doc._rev;
  }
  return await db.put(doc);
};

const getDoc = async (db, docId) => {
  try {
    return await db.get(docId);
  } catch (e) {
    if (e.status === 404) {return null;}
    throw e instanceof Error ? e : new Error(JSON.stringify(e));
  }
};

async function addDocAttachment(db, options, retries = MAX_RETRY) {
  const { docId, attachmentName, attachment, currentRev } = options;
  const contentType = getContentType(attachmentName, attachment);

  try {
    return await db.putAttachment(docId, attachmentName, currentRev, attachment.data, contentType);
  } catch (err) {
    if (err.status === 409 && retries >= 0) {
      const latestDoc = await getDoc(db, docId);
      return addDocAttachment(db, { ...options, currentRev: latestDoc._rev }, retries - 1);
    }
    throw new Error(`Failed to add attachment ${attachmentName} to ${docId}: ${err.message}`);
  }
}


const handleAttachments = async (db, docId, attachments, initialRev) => {
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
  const functionalRegex = /^(form|model)\.xml$|^form\.html$|^xml$/i;
  const functionalAttachments = {};
  const mediaAttachments = {};

  for (const [name, value] of Object.entries(attachments || {})) {
    if (!value?.data) {
      log.warn(`Skipping invalid attachment ${name} for ${docId}: missing data`);
      continue;
    }
    (functionalRegex.test(name) ? functionalAttachments : mediaAttachments)[name] = value;
  }

  return { functionalAttachments, mediaAttachments };
};

const saveFunctionalDoc = async (db, doc, functionalAttachments, existingRev) => {
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
