// Imports the name of the MySQL database to connect to
const { sqldbName, sqlConnLimit } = require('./dbinfo');

module.exports = {
	mysql: {
		host: 'db-mysql-sgp1-21822-do-user-6725289-0.db.ondigitalocean.com',
		port: 25060,
		user: 'fred', password: 'Pokemon322W',
		database: sqldbName,
		connectionLimit: sqlConnLimit,
		cacert: './ca-certificate.crt.txt'
	},
	s3: {
		// DigitalOcean Spaces: 'abc123'
		accessKeyId: 'JE6UW66LJTRSP32RT2EF',
		secretAccessKey: 'cs5ztGliv+/qgJUT220XdUW74u9jfriEiE3N/2jpLpQ'
	},
	mongodb: {
		// Using fred with RW permissions only
		url: 'mongodb://fred:fredfred@mycluster2-shard-00-00-snjdj.mongodb.net:27017,mycluster2-shard-00-01-snjdj.mongodb.net:27017,mycluster2-shard-00-02-snjdj.mongodb.net:27017/test?ssl=true&replicaSet=mycluster2-shard-0&authSource=admin&retryWrites=true&w=majority'
	}
}
