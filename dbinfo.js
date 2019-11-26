// Database information and settings

// ||| MySQL

// Name of MySQL database to connect to
const sqldbName = 'music';
// Max pool connection limit
const sqlConnLimit = 4;


// ||| DigitalOcean Spaces S3

// URL of DigitalOcean Space - most likely will not change
const DO_SPACE_URL = 'sgp1.digitaloceanspaces.com';
// Name of the DigitalOcean bucket
const bucketName = 'abc1234';
// Name of the folder for the file(s) to be stored in the bucket
const bucketFolderName = 'music';
// File to be used for testing the connection to the space
const bucketTestKey = 'forTestingConnectionDontDelete.txt';


// ||| Atlas MongoDB

// Name of the database
const mongoDBName = 'music';
// Name of the collection
const mongoDBCollection = 'user_history';

module.exports = {
    sqldbName,
    sqlConnLimit,
    DO_SPACE_URL,
    bucketName,
    bucketFolderName,
    bucketTestKey,
    mongoDBName,
    mongoDBCollection
}
