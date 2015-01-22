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

			var html = '';
			var prices = $('span.display-price').each(function(index) {
				if($(this).text() === 'Free') {
					html += $(this).parents('.card').html();
					// console.log($(this).parents('.details').html());

					var entry = new Entry({
						title: "This is a test",
						url: "This is a test",
						pictureUrl: "This is a test",
						dateDiscovered: new Date()
					});

					entry.save(function(err, entry) {
						if (err) {
							return console.error(err);
						} else {
							console.dir(entry);
						}
					});
				}
			});

			res.send(html) // Show the HTML for the Google homepage.
		}
	})
});





 
app.listen(serverPort, serverIP, function () {
	console.log( "Listening on " + serverIP + ", port " + serverPort )
});