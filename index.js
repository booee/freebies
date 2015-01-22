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
var EntrySchema = new mongoose.Schema({
	title: String,
	url: String,
	pictureUrl: String,
	dateDiscovered: Date
});
mongoose.model('Entry', EntrySchema);
var Entry = mongoose.model('Entry');








///////////////////
// CONTROLLER
var request = require('request');
var cheerio = require('cheerio');
var url = 'https://play.google.com/store/music';

app.get('/', function (req, res) {
	request(url, function (error, response, body) {
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

					var entry = new Entry({
						title: albumTitle + ' by ' + artist,
						url: albumLink,
						pictureUrl: imgUrl,
						dateDiscovered: new Date()
					});

					entry.save(function(err, entry) {
						if (err) {
							return console.error(err);
						} else {
							console.dir("Successfully committed new entry to DB: " + entry);
						}
					});
				}
			});

			res.send("Finished!") // Show the HTML for the Google homepage.
		}
	})
});





 
///////////////////
// RUN SERVER
app.listen(serverPort, serverIP, function () {
	console.log( "Listening on " + serverIP + ", port " + serverPort )
});