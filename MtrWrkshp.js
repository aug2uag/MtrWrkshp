
var Vids = new Meteor.Collection('videos');

if (Meteor.isClient) {

  Meteor.startup(function () {
    Meteor.call('vidsLoaded', function (){
      Session.set('loaded', true);
    });
  });

  Meteor.subscribe('vids');

  Template.vids.videosLoaded = function () {
    return Session.get('loaded');
  };

  Template.vids.videos = function() {
    return Vids.find({}, {$sort:{rawd:-1}});
  }

};

if (Meteor.isServer) {

  var self = this;
  self.falsy = false;
  
  Meteor.startup(function () {
    Vids.remove({});

    // ensureIndex on the server side
    Vids._ensureIndex({ "title": 1}, {unique:true});

    function paginate(callback) {
      if (self.falsy) return;
      var req = "https://www.googleapis.com/youtube/v3/search?key=$KEY&channelId=UC3fBiJrFFMhKlsWM46AsAYw&pageToken=" + n + "&part=snippet,id&order=date&maxResults=50";
      HTTP.get(req, function (error, result) {
        if (!error && result.statusCode === 200) {
          n = JSON.parse(result.content)['nextPageToken'] || '';

          acc.push(JSON.parse(result.content)['items']);

          callback(0);

        }
      });
    }

    function final() {
      self.falsy = true;
      acc = _.unique(_.flatten(acc));
      _.forEach(acc, function(itm) {
        var d = new Date(itm.snippet.publishedAt);
        if (itm && itm.snippet.title.toLowerCase().indexOf('devshop') > -1 && d.getFullYear() > 2000) {
          Vids.insert({
            title: itm.snippet.title,
            date: (d.getMonth() + 1) + '/' + d.getDate() + '/' +  d.getFullYear(),
            urlink: itm.id.videoId,
            rawd: d
          });
        } 
      });
    }

    var acc = [], n;
  
    HTTP.get("https://www.googleapis.com/youtube/v3/search?key=$KEY&channelId=UC3fBiJrFFMhKlsWM46AsAYw&part=snippet,id&order=date&maxResults=50", function (error, result) {
      if (!error && result.statusCode === 200) {
        var total = Math.ceil(JSON.parse(result.content)['pageInfo']['totalResults']/50);

        n = JSON.parse(result.content)['nextPageToken'] || '';

        acc.push(JSON.parse(result.content)['items']);
        
        var i = 1, arr = [];
        while (i < total) {
          i++;
          arr.push(i);
        }

        var results = [];
        function series(item) {
          if(item) {
            paginate(function(result) {
              results.push(result);
              return series(arr.shift());
            });
          } else {
            return final();
          }
        }
        series(arr.shift());
      }

      return;
    });

  });

  Meteor.publish('vids', function() {
      return Vids.find();
  });

  Vids.allow({ 
      insert:function() {
          return true;
      },
      remove: function() {
          return true;
      }
  });

  Meteor.methods({
    vidsLoaded: function(vars) {
      // get data from remote API
      return self.falsy;
    }
  });
}
