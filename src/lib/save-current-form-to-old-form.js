const {info} = require('./log');
module.exports = (db, doc) =>
    db.get(doc._id, { attachments: true, binary: true })
        .then(existingDoc => {
            existingDoc.doc_id = existingDoc._id;
            existingDoc.type = 'old-form';
            existingDoc._id = undefined;
            existingDoc._rev = undefined;
            const attachments = existingDoc._attachments;
            existingDoc._attachments = {};
            Object.keys(attachments).forEach(name => {
                existingDoc._attachments[name] = {};
                const keys = Object.keys(attachments[name]);
                if (keys.includes('content_type') && keys.includes('data')) {
                    existingDoc._attachments[name]['content_type'] = attachments[name]['content_type'];
                    existingDoc._attachments[name]['data'] = Buffer.from(attachments[name]['data']);
                }
            });
            return db.post(existingDoc);
        })
        .then(response => info(`previous form saved in doc with _id: ${response.id} type:'old-form'`))
        .catch(e => {
            info('old form failed');
            if(e.status === 404) return;
            else throw e;
        });
