var request = require('request');
var cheerio = require('cheerio');

function GooglePlayMusicCrawler() {
	var url = 'https://play.google.com/store/music';

	this.getAlbums = function(callback) {
		request(url, function(error, response, body) {
			var albums = [];
			var urls = [];

			if(!error && response.statusCode == 200) {

				$ = cheerio.load(body);

				var prices = $('span.display-price').each(function(index) {
					var $this = $(this);
					var $card = $(this).parents('.card');
					var $album = $card.find('a.title');

					var album = {};
					album.title = $album.text().trim();
					album.artist = $card.find('a.subtitle').text().trim();
					album.artUrl = $card.find('img.cover-image').attr('src');
					album.url = 'http://play.google.com' + $album.attr('href');
					album.price = $this.text();


					if(urls.indexOf(album.url) < 0) {
						console.log('found album: ' + album.title);
						urls.push(album.url);
						albums.push(album);
					}
				});
			}

			callback(albums);
		});
	}
}

module.exports = GooglePlayMusicCrawler;