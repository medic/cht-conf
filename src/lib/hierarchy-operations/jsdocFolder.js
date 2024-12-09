const path = require('path');
const userPrompt = require('../user-prompt');
const fs = require('../sync-fs');
const { warn, trace } = require('../log');

function prepareFolder({ docDirectoryPath, force }) {
  if (!fs.exists(docDirectoryPath)) {
    fs.mkdir(docDirectoryPath);
  } else if (!force && fs.recurseFiles(docDirectoryPath).length > 0) {
    deleteAfterConfirmation(docDirectoryPath);
  }
}

function writeDoc({ docDirectoryPath }, doc) {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  if (fs.exists(destinationPath)) {
    warn(`File at ${destinationPath} already exists and is being overwritten.`);
  }

  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
}

function deleteAfterConfirmation(docDirectoryPath) {
  warn(`The document folder '${docDirectoryPath}' already contains files. It is recommended you start with a clean folder. Do you want to delete the contents of this folder and continue?`);
  if (!userPrompt.keyInYN()) {
    throw new Error('User aborted execution.');
  }
  
  fs.deleteFilesInFolder(docDirectoryPath);
}

function deleteDoc(options, doc, disableUsers) {
  writeDoc(options, {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true,
    disableUsers: !!disableUsers,
  });
}

module.exports = {
  deleteDoc,
  prepareFolder,
  writeDoc,
};

