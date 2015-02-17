var request = require('request');

function GooglePlayMusicCrawler() {

	this.getAlbums = function(callback) {

		request("https://www.kimonolabs.com/api/bl9en5wk?apikey=0gHTE2tdYJgLaDC1A0umHPckJyd0qXwu", function(error, response, body) {
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

					if(albums.urls.indexOf(album.url) < 0) {
						albums.urls.push(album.url);
						albums.push(album);
					}
				}
			}
			
			callback(albums);
		});
	}

	function getPrice(rawPrice) {
		if(rawPrice === undefined || rawPrice === null) {
			price = 0;
		} else if(rawPrice.indexOf('$') <= 0) {
			price = rawPrice.substring(rawPrice.indexOf('$') + 1, rawPrice.length);
		}

		if(price == "Free") {
			price = 0;
		}

		return price;
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