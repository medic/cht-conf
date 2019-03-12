const Json2csvParser = require('json2csv').Parser;
const fs = require('fs');
const fields = ['username', 'password', 'roles','contact.name','phone','contact.id','place'];
const info = require('../lib/log').info;
const json2csvParser = new Json2csvParser({ fields, doubleQuote: "'", flatten:true});

 
module.exports = (data, csvPath) => {
    //type is deprecated in the api and is replaced by roles
    //passing type to the api will use that for the roles instead of roles
    //type here is being generated based on the type of doc being created
    data.forEach(function(e){delete e.type;});
    const csv = json2csvParser.parse(data);
    fs.writeFile(csvPath, csv, function(err){
        if (err) { throw err; }
        info('Users csv has been saved');
    });
};
