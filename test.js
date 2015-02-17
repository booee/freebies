var crawler = require('./lib/GooglePlayMusicCrawler');

new crawler().getFreeAlbums(function(albums){

	if(!albums || !albums.length) {
		console.log('no albums detected');
	}
	
	for(var i = 0, len = albums.length; i < len; i++) {
		var album = albums[i];
		console.log('found album: ($' + album.price + ') ' + album.title);
	}
});