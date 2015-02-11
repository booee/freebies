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
					album.price = getPrice($this.text());


					if(urls.indexOf(album.url) < 0) {
						urls.push(album.url);
						albums.push(album);
					}
				});

				// TODO: repeat for other pages via POST
			}

			callback(albums);
		});
	}

	function getPrice(rawPrice) {
		if(rawPrice === undefined || rawPrice === null) {
			price = 0;
		} else if(rawPrice.indexOf('$') <= 0) {
			price = new Number(rawPrice.substring(rawPrice.indexOf('$') + 1, rawPrice.length));
		} else if(rawPrice == 'Free') {
			price = 0;
		} else {
			price = new Number(rawPrice);
		}

		return price;
	}

	function retrieveAdditionalPages(albums, callback) {

	}
}

module.exports = GooglePlayMusicCrawler;