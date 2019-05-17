const fs = require('fs'),
      path = require('path')/*,
       exec = require('child_process').exec,
       script = require('../../bin/pushSqlToServer.sh')*/;
// FIXME
// async function pushPastSsh(filename) {
//   require('thing').fork('../../scripts/sqlise', [filenam, auth, etc])
// }

// sqls.forEach((sqlFile) => await pushPastSsh(sqlFile));
/*
 * (it) Filters for '.sql' extensions
 * @param: aboslute path whose extension is in question
 * @return: boolean
 */
const extension = element => {
  return path.extname(element) === '.sql'; // check for sql files only
};
/*
 * (it) Flattens an array rescursively
 * @param: array object
 * @return: one-dimensional array
 */
const flatten = list => list.reduce(
  (a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []
);
/*
 * (it) Lists all files with absolute paths, synchronously and recursively
 * @param: directory, elements list
 * @return: List
 */
const recurseSyncList = (dir, fileList = []) => {
  // get files from directory
  const files = fs.readdirSync(dir);
  // loop through the files
  files.forEach((file) => {
    // if directory, get files and recurse, else add absolute path to list
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = recurseSyncList(path.join(dir, file), fileList);
    }
    else {
      if(extension(path.join(dir, file))) {
        fileList.push(path.join(dir, file));
      }
    }
  });
  return flatten(fileList).sort();
};
/*
 * (it) Pushes a file to a server securely, using a bash script
 * @param: URL of couchDB instance
 * @return: callback
 */

module.exports = (projectDir, couchUrl) => {
  const sqlDir = path.join(projectDir, 'sql');
  if (fs.existsSync(sqlDir)) {
    const sqlFilesList = recurseSyncList(sqlDir);
    // FIXME: Complete code for pushPastSsh()
    sqlFilesList.forEach((sqlFile) => console.log(sqlFile,couchUrl));
  }
  console.log('You called upload-sql');

};