const path = require('path');
const userPrompt = require('../user-prompt');
const fs = require('../sync-fs');
const { warn, trace } = require('../log');

const prepareFolder = ({ docDirectoryPath, force }) => {
  if (!fs.exists(docDirectoryPath)) {
    fs.mkdir(docDirectoryPath);
  } else if (!force && fs.recurseFiles(docDirectoryPath).length > 0) {
    warn(`The document folder '${docDirectoryPath}' already contains files. It is recommended you start with a clean folder. Do you want to delete the contents of this folder and continue?`);
    if(userPrompt.keyInYN()) {
      fs.deleteFilesInFolder(docDirectoryPath);
    } else {
      throw new Error('User aborted execution.');
    }
  }
};

const writeDoc = ({ docDirectoryPath }, doc) => {
  const destinationPath = path.join(docDirectoryPath, `${doc._id}.doc.json`);
  if (fs.exists(destinationPath)) {
    warn(`File at ${destinationPath} already exists and is being overwritten.`);
  }

  trace(`Writing updated document to ${destinationPath}`);
  fs.writeJson(destinationPath, doc);
};

module.exports = {
  prepareFolder,
  writeDoc,
};
