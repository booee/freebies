var crawler = require('./lib/GooglePlayMusicCrawler');

new crawler().getAlbums(function(albums){
	for(var i = 0, len = albums.length; i < len; i++) {
		var album = albums[i];
		console.log('found album: ($' + album.price + ') ' + album.title);
	}
});