const request = require('request-promise-native');

const pouch = require('./db');
const formsList = require('./forms-list');
const insertOrReplace = require('./insert-or-replace');

class PouchRepository {
  constructor(data) {
    if (typeof data === 'object') {
      this.couchUrl = 'unknown';
      this.db = data;
    }
    else {
      this.couchUrl = data;
      this.db = pouch(data);
    }
  }

  allDocs(options = {}) {
    return this.db.allDocs(options);
  }

  bulkDocs(docs) {
    return this.db.bulkDocs(docs);
  }

  createUser(userData) {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');

    return request({
      uri: `${instanceUrl}/api/v1/users`,
      method: 'POST',
      json: true,
      body: userData,
    });
  }

  /**
   * Given a contact's id, obtain the documents of all descendant contacts
   */
  async descendantsOf(contactId) {
    const descendantDocs = await this.db.query('medic/contacts_by_depth', {
      key: [contactId],
      include_docs: true,
    });

    return descendantDocs.rows
      .map(row => row.doc)
      /* We should not move or update tombstone documents */
      .filter(doc => doc && doc.type !== 'tombstone');
  }

  get description() {
    return this.couchUrl;
  }

  formsList(options = {}) {
    return formsList(this.db, options);
  }

  get(docId, options = {}) {
    return this.db.get(docId, options);
  }
  
  insertOrReplace(doc) {
    return insertOrReplace(this.db, doc);
  }

  put(doc) {
    return this.db.put(doc);
  }

  remove(doc, options = {}) {
    return this.db.remove(doc, options);
  }

  async reportsCreatedBy(contactIds) {
    const reports = await this.db.query('medic-client/reports_by_freetext', {
      keys: contactIds.map(id => [`contact:${id}`]),
      include_docs: true,
    });

    return reports.rows.map(row => row.doc);
  }

  requestAppSettings() {
    const settingsUrl = `${this.couchUrl}/_design/medic/_rewrite/app_settings/medic`;
    return request({ url: settingsUrl, json: true })
      .catch(err => {
        if(err.statusCode === 404) {
          throw new Error(`Failed to fetch existing app_settings from ${settingsUrl}.\n` +
              `      Check that medic-api is running and that you're connecting on the correct port!`);
        } else {
          throw err;
        }
      });
  }
 
  updateAppSettings(content) {
    return request.put({
      method: 'PUT',
      url: `${this.couchUrl}/_design/medic/_rewrite/update_settings/medic?replace=1`,
      headers: { 'Content-Type':'application/json' },
      body: content,
    });
  }

  uploadSms(messages) {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');
    return request({
      uri: `${instanceUrl}/api/sms`,
      method: 'POST',
      json: true,
      body: { messages },
    });
  }

  version() {
    const instanceUrl = this.couchUrl.replace(/\/medic$/, '');
    return request({ uri: `${instanceUrl}/api/deploy-info`, method: 'GET', json: true }) // endpoint added in 3.5
      .catch(() => this.db.get('_design/medic-client').then(doc => doc.deploy_info)) // since 3.0.0
      .then(deploy_info => deploy_info && deploy_info.version);
  }
}

module.exports = PouchRepository;
