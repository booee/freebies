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
var Crawler = require('./lib/GooglePlayMusicCrawler');

function updateEntries(callback) {
	var crawlCallback = function(newlyParsedEntries) {
		var preExistingEntriesToUpdate = [];
		Entry.find({'status': STATUS_ACTIVE}).exec(function(err, results) {
			if(!err) {
				compareToExistingEntries(results, newlyParsedEntries);
				saveAllAlbums(newlyParsedEntries);
				
			} else {
				console.error('Error while retrieving pre-existing active entries: ' + err);
			}
		});

		callback();
	}

	new Crawler().getFreeAlbums(crawlCallback);
}

function compareToExistingEntries(existingEntries, newlyFoundEntries, callback) {
	for(var i = 0, len = existingEntries.length; i < len; i++) {
		var existing = existingEntries[i];
		var index = newlyFoundEntries.urls.indexOf(existing.url);
		if(index >= 0) {
			console.warn('Pruning newly parsed entry because it already exists in the db: ' + newlyFoundEntries[index].title);
			newlyFoundEntries.splice(index, 1);
			newlyFoundEntries.urls.splice(index, 1);
		} else {
			updateAlbumAsInactive(existing);
		}
	}
}

function updateAlbumAsInactive(entry) {
	console.log('Moving ' + entry.title + ' to inactive');
	entry.status = STATUS_INACTIVE;
	entry.save(function(err, entry) {
		if(err) {
			console.error('Error setting entry as inactive', err);
		} else {
			console.log("Successfully updated entry as inactive");
		}
	});
}

function saveAllAlbums(albums) {
	for(var i = 0, len = albums.length; i < len; i++) {
		var album = albums[i];
		var entry = new Entry({
			platform: PLATFORM_GOOGLE_PLAY_MUSIC,
			title: album.title,
			by: album.artist,
			url: album.url,
			dateDiscovered: new Date(),
			status: STATUS_ACTIVE
		});

		entry.save(function(err, entry) {
			if (err) {
				console.error('Error committing entry to DB', err);
			} else {
				console.log("Successfully committed new entry to DB: " + entry.title);
			}
		});
	}
}



var Feed = require('feed');

function getRssFeed(renderType, callback) {
	var feed = new Feed({
	    title:          'Free Album of the Week (Google Play Music)',
	    description:    'Subscribe to this, and you\'ll never miss the free music again',
	    link:           'http://yakshaving.io',

	    author: {
	        name:       'Yak Shaver 9000 '
	    }
	});

	Entry.find({'status': STATUS_ACTIVE}).sort({dateDiscovered: -1}).limit(20).exec(function(err, result) {
		if(!err) {
			for(var i = 0, len = result.length; i < len; i++) {
				var entry = result[i];

				feed.addItem({
					title: entry.title + " - " + entry.by,
					link: entry.url,
					description: entry.title + " - " + entry.by,
					date: entry.dateDiscovered,
					content: 'Free on Google Play Music'
				});
			}
		} else {
			console.error('Error while retrieving active entries for feed: ' + err);
		}

		callback(feed.render(renderType).trim());
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
