var express = require('express'),
  	app = express(),
    config = require('./config'),
  	request = require('superagent'),
  	cloudinary = require('cloudinary'),
    fs = require('fs'),

    // change this to desired local directory
    directory = '/img',
    exec = require('exec'),
    wget = require('node-wget'),

    cursor = "",
    nextCursor = "",
    done = false,
    port = 8080;

// No reason to touch a browser
// app.get('/', function (req, res) {
//   request.get("https://789423776114718:BXCCmMwEuhohSFCpz7QL-gUV3oY@api.cloudinary.com/v1_1/galore/resources/image").end(function(err,response) {
// 		if (err) {
// 			console.log(err);
// 			res.status(404).send(err);
// 		} else {
// 			// var shows = processShow(response.body.items);
// 			res.status(200).send(function() {
//         getPhotos(response);
//       });
// 		}
// 	});
// });

// if (done === true) {
//   res.status(200).send(function() {
//     document.write('IT IS FINISHED');
//   });
// }

cloudinary.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret
});

cloudinary.api.resources(function(result) {
  cursor = result.next_cursor;
  console.log("NEXT PAGE " + cursor);
}, {type: 'upload', max_results: 0});

var grabNext = function(cursor_page, callback) {
  cloudinary.api.resources(function(result) {
    nextCursor = result.next_cursor;
    // console.log("NEXT PAGE " + next);
    result.resources.asyncEach(function(item, resume) {
      var listUrl = item.url,
          itemName = listUrl.substr(listUrl.lastIndexOf('/') + 1);

      console.log(itemName);
      var wget = 'wget -q -P ' + directory + ' ' + listUrl;

      fs.exists(itemName, function(exists) {
        if (exists) {
          console.log(exists);
          return;
        } else {
          var child = exec(wget, function(err, stdout, stderr) {
              if (err) {
                console.log(err);
              } else {
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                console.log(itemName + ' downloaded to ' + directory);
              }
          });
          resume();
        }
      });
    });
  }, {next_cursor: cursor, type: 'upload', max_results: 10, direction: "asc"});
};

// Run first time
grabNext(cursor, function(err, res) {
  if (err) {
    console.log("~ FUCK ~")
  } else {
    console.log("ALL DONE");
  }
});

// Nice iterator ala https://blog.jcoglan.com/2010/08/30/the-potentially-asynchronous-loop/
Array.prototype.asyncEach = function(iterator) {
  var list    = this,
      n       = list.length,
      i       = -1,
      calls   = 0,
      looping = false;

  var iterate = function() {
    calls -= 1;
    i += 1;
    if (i === n) {
      cursor = nextCursor;
      console.log("PAGE DONE");
      console.log("NEXT PAGE " + cursor);
      done = true;
      grabNext(cursor, function(err, res) {
        if (err) {
          console.log("~ FUCK ~")
        } else {
          console.log("ALL DONE");
        }
      });
    } else {
      iterator(list[i], resume);
    }
  };

  var loop = function() {
    if (looping) console.log("done"); return;
    looping = true;
    while (calls > 0) iterate();
    looping = false;
  };

  var resume = function() {
    calls += 1;
    if (typeof setTimeout === 'undefined') loop();
    else setTimeout(iterate, 1);
  };
  resume();
};

var server = app.listen(port, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
