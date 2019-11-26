// Load the libraries
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const express = require('express');
const hbs = require('express-handlebars');
// const moment = require('moment');
// const request = require('request-promise');

// Country list library
const countryList = require('iso-3166-country-list');

// Refactored functions for MySQL queries/transactions
const db = require('./dbutil');

// Refactored functions for mongoDB queries
const dbmongo = require('./mongoutil');

// Config file
const config = require('./productionConfig');

// Functions to initialize databases
const { loadConfig, testConnections } = require('./initdb');

// Load databases info and settings
const { DO_SPACE_URL,bucketName, bucketFolderName,
		mongoDBName, mongoDBCollection } = require('./dbinfo');

// Load mysql, s3 and mongodb connections as pool, s3 and atlasClient
const { mysql: pool, s3, mongodb: atlasClient } = loadConfig(config);


// MySQl query phrases
const qp_CHECK_USER = 'select * from users where username = ?';
const qp_ADD_SONG = 'insert into song_info(song_title, lyrics, num_listening_slots, country, song_file_name) values (?, ?, ?, ?, ?)';
const qp_GET_ALL_SONGS = 'select sco.song_title as title, si.country as country, si.num_listening_slots as listen_slots, count(*) as checked_out from song_checked_out as sco join song_info as si on sco.song_title = si.song_title group by sco.song_title';

const qp_GET_USER_ID = 'select user_id from users where username = ?';
const qp_ADD_INTO_SCO = 'insert into song_checked_out(user_id, song_title, checkout_datetime) values (?, ?, current_timestamp())';
const qp_ADD_INTO_UCO = 'insert into user_checked_out(user_id, song_title, checkout_datetime) values (?, ?, current_timestamp())';

const qp_GET_SONG_TOTAL_PLAY_COUNT = 'select count(*) as total from user_checked_out where song_title = ?';
const qp_GET_SONG_INFO = 'select * from song_info where song_title = ?';

const qp_INCREASE_LISTENING_SLOT = 'delete from song_checked_out where id = ?';

// MySQl query functions
const checkUser = db.mkQueryFromPool(db.mkQuery(qp_CHECK_USER), pool);
const addSong = db.mkQueryFromPool(db.mkQuery(qp_ADD_SONG), pool);
const getAllSongs = db.mkQueryFromPool(db.mkQuery(qp_GET_ALL_SONGS), pool);

const getUserID = db.mkQueryFromPool(db.mkQuery(qp_GET_USER_ID), pool);
const insertSCO = db.mkQueryFromPool(db.mkQuery(qp_ADD_INTO_SCO), pool);
const insertUCO = db.mkQueryFromPool(db.mkQuery(qp_ADD_INTO_UCO), pool);

const getSongPlayCount = db.mkQueryFromPool(db.mkQuery(qp_GET_SONG_TOTAL_PLAY_COUNT), pool);
const getSongInfo = db.mkQueryFromPool(db.mkQuery(qp_GET_SONG_INFO), pool);

const increaseListeningSlot = db.mkQueryFromPool(db.mkQuery(qp_INCREASE_LISTENING_SLOT), pool);

// Multer
// Uses the tmp directory to temporarily store folders
const upload = multer({ dest: path.join(__dirname, '/tmp/') });

// Port
const PORT = parseInt(process.argv[2] || process.env.APP_PORT || process.env.PORT) || 3000;

// Start the application
const app = express();

// Handlebars
app.engine('hbs', hbs({ defaultLayout: 'main.hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));




// CORS and Morgan
app.use(cors());
app.use(morgan('tiny'));

// Handle requests here

// Task 3: To upload a song
app.post('/api/upload', upload.single('musicfile'),
    (req, res, next) => {
        // On response sent, delete the file uploaded by user
        // Accounts for all cases in one place
        res.on('finish', () => {
            // If request handled is a single file upload
            if (req.file.path) {
                fs.unlink(req.file.path, err => {});
            }
        })
        // Gets the username to authenticate
        const username = req.body.username;
        if (!username)
            return res.status(400).type('text/html').send('<h2>Missing uploader<h2>');
        // Check if the uploader/user exists
        // If the uploader/user does not exist, return 403
        checkUser([ username ])
            .then(result => {
                if (result.length) {
                    return next();
                }
                // If code here can be reached, means user does not exist
                // result = [];
                res.status(403).type('text/html').send(`<code>${username}</code><h2>Not authorized to upload<h2>`);
            })
            .catch(err => {
                res.status(500).type('text/html').send('<h2>Oops something went wrong!</h2>');
            });
    },

    (req, res) => {
        // Get info from file
        // song_title, lyrics, num_listening_slots, country, song_file_name
        const formInfo = req.body;
        const songInfoArray = [ formInfo.song_name, formInfo.lyrics, parseInt(formInfo.listen_slots), formInfo.country, req.file.filename]

		// Upload music file to s3
		new Promise((resolve, reject) => {
			fs.readFile(req.file.path, (err, musicFile) => {
				if (err) {
					return reject(err);
				}
				// Config: public can access
				const params = {
					Bucket: bucketName,
					Key: `${bucketFolderName}/${req.file.filename}`,
					Body: musicFile,
					ACL: 'public-read',
					ContentType: req.file.mimetype,
					ContentLength: req.file.size,
					Metadata: {
						originalName: req.file.originalname,
						update: '' + (new Date()).getTime()
					}
				};
				s3.putObject(params, (error, result) => {
					if (error) {
						return reject(error);
					}
					resolve();
				})
			})	
		})
		// Add entry into mongoDB 
		.then(() => {
			return (
                addSong(songInfoArray)
			);
		})
		.then(result => {
            console.log(`File access is: https://${bucketName}.${DO_SPACE_URL}/${bucketFolderName}/${req.file.filename}`)
			return res.status(201).type('text/html').send(`<h2>Submitted! Response: <code>${result}</code></h2>`);
		})
		.catch(err => {
			return res.status(500).type('text/html').send(`<h2>Error: ${err}</h2>`);
		});
    }
)

// replace _ with space for country names!!

// This is req.body [Object: null prototype] {
//     username: 'fred',
//     song_name: 'Yeah',
//     country: 'Japan',
//     listen_slots: '3',
//     lyrics: 'dffdsf'
//   }
//   This is req.file {
//     fieldname: 'musicfile',
//     originalname: 'japan.mp3',
//     encoding: '7bit',
//     mimetype: 'audio/mp3',
//     destination: 'C:\\Users\\work\\Desktop\\pafassessment\\server\\tmp\\',
//     filename: '80b9bc0f4f8853a7309fabe8f3791fc8',
//     path: 'C:\\Users\\work\\Desktop\\pafassessment\\server\\tmp\\80b9bc0f4f8853a7309fabe8f3791fc8',
//     size: 776514
//   }

// Task 4: To list all the uploaded songs
app.get('/api/songs/all', (req, res) => {
    getAllSongs()
    .then((results) => {
        // Add the country code
        results.forEach(entry => {
            entry.countryCode = countryList.code(entry.country).toLowerCase();
        })
        // console.log('>>> song array: ', results);
        res.status(200).type('text/html').render('musiclist', { songs: results });    
    })
    .catch(err => {
        res.status(500).type('text/html').send(`<h2>Error: ${err}</h2>`);
    });
})

// Task 5: To list the available songs for listening
app.get('/api/songs/listen', (req, res) => {
    const user = req.query.user;
    getAllSongs()
    .then((results) => {
        // Add the country code
        results.forEach(entry => {
            entry.countryCode = countryList.code(entry.country).toLowerCase();
            // Add additional field stating that song is avilable if
            // number of listen slots > checked_out
            // For handlebars if condition
            if (entry.listen_slots > entry.checked_out) {
                entry.status = 1;
            }
        })
        // console.log('>>> song array: ', results);
        res.status(200).type('text/html').render('musictoplay', { songs: results, user });    
    })
    .catch(err => {
        res.status(500).type('text/html').send(`<h2>Error: ${err}</h2>`);
    });
})

// Task 5: Buttons
app.get('/api/songs/listen/:songtitle', (req, res) => {
    const songTitle = req.params.songtitle;
    const user = req.query.user;

    // Get user id
    getUserID([ user ])
    .then(result => {
        // User_id is result[0].user_id
        const userID = result[0].user_id;
        // Insert statements to song_checked_out, user_checked_out, user_history
        // Available listen slots are controlled via songs_checked_out
        const p1 = insertSCO([ userID, songTitle ]);
        const p2 = insertUCO([ userID, songTitle ]);
        const p3 = atlasClient.db(mongoDBName).collection(mongoDBCollection)
                    .insertOne({
                        user_id: userID,
                        song_title: songTitle,
                        checkOutDateTime: (new Date()).getTime()
                    })
        return(
            Promise.all([p1, p2, p3, userID])
        );
    })
    .then(results => {
        // console.log('>>>>> Results array is: ', results);
        // Get userID passed from previous then
        const userID = results[3];
        // Get insertedId from song_checked_out, bring it to next page
        const insertedId = results[0].insertId;
        // Get song info and how many times it has been played
        // Just pass variables that you want to preserve into the next scope into the promise all array
        return (
            Promise.all([getSongPlayCount([ songTitle ]), getSongInfo([ songTitle ]), userID, insertedId])
        );
    })
    .then(results => {
        // Carry over info from previous scope
        const userID = results[2];
        const insertedId = results[3];
        const songPlayCount = results[0][0].total;
        const songInfo = results[1][0];
        // Add the country code
        songInfo.countryCode = countryList.code(songInfo.country).toLowerCase();
        console.log('>>> UserID is: ', userID, '>>> Inserted ID is: ', insertedId);
        console.log('>>> song play count is: ', songPlayCount, '>>> song info is: ', songInfo);
        // Pass all info
        res.status(200).type('text/html').render('musicplayed', { insertedId, songPlayCount, songInfo });
    })
    .catch(err => {
        res.status(500).type('text/html').send(`<h2>Error: ${err}</h2>`);
    })
})

// Task 6: Back button releases a listening slot
app.get('/api/songs/delete', (req, res) => {
    //
    const id = req.query.id;
    increaseListeningSlot([ id ])
    .then(result => {
        // Redirects back to home page
        res.status(200).type('text/html').redirect('/');
    })
    .catch(err => {
        res.status(500).type('text/html').send(`<h2>Error: ${err}</h2>`);
    });

})

// Serve static folders
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'public', 'images')));

// Execute 3 promises from initdb.js
// If successful, start app.listen
testConnections(pool, atlasClient, s3)
	.then(() => {
		app.listen(PORT,
			() => {
				console.info(`Application started on port ${PORT} at ${new Date()}`);
			}
		)
	})
	.catch(error => {
		console.error(error);
		process.exit(-1);
    })
