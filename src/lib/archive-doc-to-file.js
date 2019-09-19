const fs = require('fs');
const path = require('path');

const archiveDocToFile = (folderPath, fileName, content) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  const replacer = (name, val) => {
    if (name === 'data' && val && val.type === 'Buffer') {
      return Buffer.from(val).toString('base64');
    }

    return val;
  };

  const sanitizedFileName = fileName.replace(/[/\\?%*:|"<>]/g, '-'); // for Windows
  const destination = path.resolve(folderPath, sanitizedFileName);
  const fileContent = typeof content === 'string' ? content : JSON.stringify(content, replacer);
  fs.writeFileSync(destination, fileContent);
};

module.exports = archiveDocToFile;
