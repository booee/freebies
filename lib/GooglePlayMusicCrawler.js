var request = require('request');

function GooglePlayMusicCrawler(apiUrl) {
	// "https://www.kimonolabs.com/api/bl9en5wk?apikey=0gHTE2tdYJgLaDC1A0umHPckJyd0qXwu"

	this.getAlbums = function(callback) {
		request(apiUrl, function(error, response, body) {
			var albums = [];
			albums.urls = [];

			if(!error && response.statusCode == 200) {

				var results = JSON.parse(body).results.Albums;

				for(var i = 0, len = results.length; i < len; i++) {
					var result = results[i];

					var album = {};
					album.title = result.Album.text;
					album.url = result.Album.href;
					album.artist = result.Artist.text;
					album.price = getPrice(result.Price.trim());

					if(!isValidAlbum(album)) {
						console.log('Skipping malformed album: '+JSON.stringify(album));
						continue;
					 }

					if(albums.urls.indexOf(album.url) < 0) {
						albums.urls.push(album.url);
						albums.push(album);
					}
				}
			}

			callback(albums);
		});
	}

	function isValidAlbum(album) {
		var isValid = true;

		if(!album.title) { console.log('Album has no title'); isValid = false; }
		if(!album.url) { console.log('Album has no url'); isValid = false; }
		if(!album.artist) { console.log('Album has no artist'); isValid = false; }
		if(album.price === undefined || album.price === null) { console.log('Album has no price'); isValid = false; }

		return isValid;
	}

	function getPrice(rawPrice) {
		if(rawPrice === undefined || rawPrice === null) {
			return;
		} else if(rawPrice.indexOf('$') >= 0) {
			return rawPrice.substring(rawPrice.indexOf('$') + 1, rawPrice.length);
		} else if(rawPrice == 'Free') {
			return 0;
		} else {
			throw 'Unexpected price format: '+rawPrice
		}
	}

	this.getFreeAlbums = function(callback) {
		var filterCallback = function(results) {
			var freeAlbums = [];
			freeAlbums.urls = [];

			for(var i = 0, len = results.length; i < len; i++) {
				if(results[i].price == 0) {
					freeAlbums.urls.push(results.urls[i]);
					freeAlbums.push(results[i]);
				}
			}

			callback(freeAlbums);
		}

		this.getAlbums(filterCallback);
	}
}

module.exports = GooglePlayMusicCrawler;
