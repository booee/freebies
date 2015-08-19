var crawler = require('./lib/GooglePlayMusicCrawler');

// var apiUrl = "https://www.kimonolabs.com/api/bl9en5wk?apikey=0gHTE2tdYJgLaDC1A0umHPckJyd0qXwu";

var apiUrl = 'https://www.kimonolabs.com/api/99kj1dng?apikey=0gHTE2tdYJgLaDC1A0umHPckJyd0qXwu';
var crawler = new crawler(apiUrl);
crawler.getAlbums(listCrawlResults);
crawler.getFreeAlbums(listCrawlResults);

function listCrawlResults(albums) {
	if(!albums || !albums.length) {
		console.log('no albums detected');
	}

	for(var i = 0, len = albums.length; i < len; i++) {
		var album = albums[i];
		console.log('found album: ($' + album.price + ') ' + album.title);
	}
}
