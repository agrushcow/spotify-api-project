var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var relatedArtist = getFromApi('artists/' + artist.id + '/related-artists', {});

        relatedArtist.on('end', function(relatedArtist) {
          artist.related = relatedArtist.artists;
            var completed = 0;
          var checkComplete = function() {
            if(completed === artist.related.length) {
                res.json(artist);
            }
          }

          artist.related.forEach(function(a) {
            var topTracks = getFromApi('artists/' + a.id + '/top-tracks', {country:'CA'});

            topTracks.on('end', function(tracks) {
              a.tracks = tracks.tracks;
              completed++;
              checkComplete();
            });
          })
        });

        relatedArtist.on('error', function(code) {
          res.sendStatus(code);
        });
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080);
