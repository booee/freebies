var express = require('express');
var mongoose = require('mongoose');

var app = express();
app.set('view engine', 'ejs'); // to load .ejs files
app.use(express.static(__dirname + '/public'));

var serverPort = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var serverIP = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var mongoUrl = process.env.OPENSHIFT_MONGODB_DB_URL || 'mongodb://127.0.0.1:27017/faotw';
mongoose.connect(mongoUrl);







///////////////////
// DAO
var STATUS_INACTIVE = 0;
var STATUS_ACTIVE = 1;

var PLATFORM_GOOGLE_PLAY_MUSIC = 1;

var EntrySchema = new mongoose.Schema({
	platform: Number,
	title: String,
	by: String,
	url: String,
	pictureUrl: String,
	dateDiscovered: Date,
	status: Number
});
mongoose.model('Entry', EntrySchema);
var Entry = mongoose.model('Entry');








///////////////////
// CONTROLLER
app.get('/', function (req, res) {
	updateEntries(function() {
		res.send('all done!');
	})
});

app.get('/rss', function (req, res) {
	console.log('Rendering RSS feed');
	res.set('Content-Type', 'text/xml');
	getRssFeed('rss-2.0', function(rssXml) {
		console.log(rssXml);
		res.send(rssXml);
	});
});

app.get('/atom', function (req, res) {
	console.log('Rendering Atom feed');
	res.set('Content-Type', 'text/xml');
	getRssFeed('atom-1.0', function(atomXml) {
		res.send(atomXml);
	});
});

// TODO: restful get returns JSON blob of active entries





///////////////////
// BIZ LOGIC
var request = require('request');
var cheerio = require('cheerio');

function updateEntries(callback) {
	var url = 'https://play.google.com/store/music';

	// TODO: leverage async library for cleaner code
	// TODO: split out google-specific logic into a single parser and compose
	request(url, function (error, response, body) {
		var newlyParsedEntries = [];
		newlyParsedEntries.urls = [];

		if (!error && response.statusCode == 200) {
			$ = cheerio.load(body);

			var prices = $('span.display-price').each(function(index) {
				if($(this).text() === 'Free') {
					var $card = $(this).parents('.card');
					var $album = $card.find('a.title');
					var albumLink = 'play.google.com' + $album.attr('href');
					var albumTitle = $album.text().trim();
					var artist = $card.find('a.subtitle').text().trim();
					var imgUrl = $card.find('img.cover-image').attr('src');

					var parsedEntry = new Entry({
						platform: PLATFORM_GOOGLE_PLAY_MUSIC,
						title: albumTitle,
						by: artist,
						url: albumLink,
						pictureUrl: imgUrl,
						dateDiscovered: new Date(),
						status: STATUS_ACTIVE
					});

					if(newlyParsedEntries.urls.indexOf(parsedEntry.url) < 0) {
						console.log('parsed entry: ' + parsedEntry.title);
						newlyParsedEntries.urls.push(parsedEntry.url);
						newlyParsedEntries.push(parsedEntry);
					} else {
						console.warn('Ignoring duplicate entry encountered while parsing: ' + parsedEntry.title);
					}
				}
			});
		}

		// Prune duplicates, save newly parsed, and deactivate invalid existing entries
		var preExistingEntriesToUpdate = [];
		Entry.find({'status': STATUS_ACTIVE}).exec(function(err, result) {
			if(!err) {

				console.log('active entry query returned ' + result.length + ' results');
				if(result.length) {
					for(var existingIndex = 0, existingLength = result.length; existingIndex < existingLength; existingIndex++) {
						var existing = result[existingIndex];
						var newlyParsedEntryIndex = newlyParsedEntries.urls.indexOf(existing.url);
						if(newlyParsedEntryIndex >= 0) {
							console.warn('Pruning newly parsed entry - already in database: ' + existing.title);
							newlyParsedEntries.splice(newlyParsedEntryIndex, 1);
						} else {
							console.log('Moving ' + existing.title + ' to inactive');
							existing.status = STATUS_INACTIVE;
							preExistingEntriesToUpdate.push(existing);
						}
					}
				} else {
					console.log('Attempted to prune newly parsed entries against pre-existing active ones, but there were no active entries to compare with!');
				}

				// Write changes to db. Don't care about being transactional here as every run will be somewhat idempotent
				var entriesToDb = newlyParsedEntries.concat(preExistingEntriesToUpdate);
				console.log('Committing ' + entriesToDb.length + ' change(s) to the database');
				if(entriesToDb.length) {
					for(var entryIndex = 0, entriesToDbLength = entriesToDb.length; entryIndex < entriesToDbLength; entryIndex++) {
						var entryToDb = entriesToDb[entryIndex].save(function(err, entry) {
							if (err) {
								return console.error('Error committing entry to DB: ' + err);
							} else {
								if(entry.status === STATUS_ACTIVE) {
									console.log("Successfully committed new entry to DB: " + entry.title);
								} else {
									console.log("Updating entry to be inactive: " + entry.title);
								}
							}
						});
					}
				}
			} else {
				console.error('Error while retrieving pre-existing active entries: ' + err);
			}
		});

		

		callback();
	});
}



var Feed = require('feed');

function getRssFeed(renderType, callback) {
	var feed = new Feed({
	    title:          'Free album of the week (Google Play Edition)',
	    description:    'Subscribe to this, and you\'ll never miss the free music again',
	    link:           'http://yakshaving.io',

	    author: {
	        name:       'Yak Shaver 9000 '
	    }
	});

	Entry.find({'status': STATUS_ACTIVE}).exec(function(err, result) {
		if(!err) {
			for(var i = 0, len = result.length; i < len; i++) {
				var entry = result[i];

				feed.addItem({
					title: entry.title,
					link: entry.url,
					description: entry.title + " by " + entry.by,
					date: entry.dateDiscovered
				});
			}
		} else {
			console.error('Error while retrieving active entries for feed: ' + err);

		}

		callback(feed.render(renderType));
	});
}




 
///////////////////
// RUN SERVER

// expose data via express
app.listen(serverPort, serverIP, function () {
	console.log( "Listening on " + serverIP + ", port " + serverPort )
});


// execute on cronjob
var schedule = require('node-schedule'); // https://github.com/mattpat/node-schedule
var cronExpression = '0 */6 * * *'; // every 6 hours, https://github.com/harrisiirak/cron-parser
var cronCallback = function() {
	console.log("Executing cronjob");
	updateEntries(function() {
		console.log("Executed timer-based update!");
	});
}
console.log("Building cronjob using expression: " + cronExpression);	
schedule.scheduleJob(cronExpression, cronCallback);


// execute on startup!
console.log("Executing on startup");
updateEntries(function(){ console.log("executed on startup!"); });