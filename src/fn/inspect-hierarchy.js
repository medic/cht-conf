/* eslint-disable no-console */
const pouch = require('../lib/db');
const { info } = require('../lib/log');
const environment = require('../lib/environment');

const execute = async () => {
  const db = pouch();
  
  // Fetch all places (depth 0 and 1)
  const result = await db.query('medic/contacts_by_depth', {
    include_docs: true,
    limit: 100,
  });

  const contacts = result.rows.map(row => row.doc);

  if (environment.extraArgs.includes('--json')) {
    console.log(JSON.stringify(contacts, null, 2));
    return;
  }

  info('Contact Hierarchy (Top 100):');
  
  const tree = {};
  contacts.forEach(c => {
    const parentId = c.parent ? (c.parent._id || c.parent) : 'root';
    if (!tree[parentId]) { tree[parentId] = []; }
    tree[parentId].push(c);
  });

  function printNode(id, indent = '') {
    const children = tree[id] || [];
    children.forEach(child => {
      console.log(`${indent}- ${child.name || child._id} (${child.type}) [${child._id}]`);
      printNode(child._id, indent + '  ');
    });
  }

  printNode('root');
};

module.exports = {
  requiresInstance: true,
  execute
};
