
// Build static files to serve. Put files in a content folder, and use handlebars if necessary.
// Content files can be .html or .md (in which case marked is also required). html files can 
// also included markdown sections in <markdown></markdown> tags.

// Requires fs and handlebars - handlebars syntax can be used to include files in other files.

// if a bundle.json file is included, then crypto, sync-request, uglify-js, uglifycss are required
// with these, bundle.json should contain a json list of routes to local js or css files, or 
// URLs starting with http which will be retrieved into the local static folder, if they don't 
// already exist there. To force a new retrieve, just append a version increment parameter to the URL.
// All files listed in the bundle.json will then be converted into a minified js and css files.

// Special templates are optional, called open, close, header, head, and footer.
// open and close customise the opening and closing html tags if necessary.
// header and footer can be defined to be included in every content file, even if not explicitly included.
// head can contain any custom head tags that may be required. Any content template can also include a 
// head tag which will be combined into the top head tag. The bundled css and js files will be added to the 
// top of the generated head section.

// if there is a local vars.json file, it will be searched for variables to inject into any handlebars 
// variables found in the content files.

// Static files should be placed in the static folder, which is where the minified css and js files will 
// be placed too (in the static/bundle folder which gets created on each build). Any files in here that are 
// not included in bundle.json can just be called in the normal way.

// Generated content will be placed in a serve folder which gets emptied on every build. 

// Use something like the example nginx config provided to serve files. 

// To route requests for particular item pages, e.g. a given widget in a set of widgets, use the aforementioned 
// nginx config and in the content/widgets folder create a content template called item.html. That template can 
// then be rendered via a call to a URL like /widgets/widget1. The template must include the necessary js code 
// to get the item specified in the URL string from some widgets API, and render it into the page.

var args = {
  nobundle: false, // if true a new js and css minified bundle will not be made, old one will be used
  noretrieve: false // if true a new bundle will be made, but only using copies already available in static
}
for ( var i = 2; i < process.argv.length; i++) {
  if (process.argv[i].indexOf('-') === 0) {
    var a = process.argv[i].replace('-',''); 
    if (args[a] === undefined) {
      console.log('No option called ' + process.argv[i]);
    } else {
      args[a] = true;
    }
  } else {
    var parts = process.argv[i].split('=');
    if (parts.length < 2 || args[parts[0]] === undefined) {
      console.log('No option called ' + process.argv[i]);
    } else {
      args[parts[0]] = parts[1];
    }
  }
}

console.log(args);

var fs = require('fs');

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

var deleteFolderRecursive = function(path) {
  if ( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        console.log("Deleting " + curPath);
        fs.unlinkSync(curPath);
      }
    });
    console.log("Deleting " + path);
    fs.rmdirSync(path);
  }
};
deleteFolderRecursive('./serve');
fs.mkdirSync('./serve');

var bundle, jshash, csshash;
try { bundle = require('./bundle.json'); } catch(err) {}
console.log(bundle)
if (!args.nobundle && bundle && typeof bundle === 'object') {
  var request, uglyjs, uglycss;
  var crypto = require('crypto');
  if (!fs.existsSync('./static')) fs.mkdirSync('./static');
  if (!fs.existsSync('./static/bundle')) fs.mkdirSync('./static/bundle');
  fs.readdirSync('./static/bundle').forEach(function(file,index) { fs.unlinkSync('./static/bundle/' + file); });
  var js = [];
  var css = [];
  for ( var b in bundle ) {
    if (bundle[b].indexOf('http') === 0) {
      var url = bundle[b];
      bundle[b] = './static/' + bundle[b].split('/').pop();
      if (!fs.existsSync(bundle[b]) || !args.noretrieve) {
        if (request === undefined) request = require('sync-request');
        var res = request('GET', url);
        fs.writeFileSync(bundle[b], res.getBody());
      }
    }
    bundle[b].indexOf('.js') !== -1 ? js.push(bundle[b]) : css.push(bundle[b]);
  }  
  // gz compress them too?
  if (js.length) {
    var uglify = require("uglify-js");
    uglyjs = uglify.minify(js);
    jshash = crypto.createHash('md5').update(uglyjs.code).digest("hex");
    fs.writeFileSync('./static/bundle/' + jshash + '.min.js', uglyjs.code);
  }
  if (css.length) {
    var uglifycss = require('uglifycss');
    uglycss = uglifycss.processFiles(css);
    csshash = crypto.createHash('md5').update(uglycss).digest("hex");
    fs.writeFileSync('./static/bundle/' + csshash + '.min.css', uglycss);
  }
}
if (args.nobundle && fs.existsSync('./static/bundle') && jshash === undefined && csshash === undefined) {
  fs.readdirSync('./static/bundle').forEach(function(file,index) {
    if (file.indexOf('.min.js') !== -1 && jshash === undefined) jshash = file.replace('.min.js','');
    if (file.indexOf('.min.css') !== -1 && csshash === undefined) csshash = file.replace('.min.css','');
  });
}

var handlebars = require('handlebars');
var templates = [];
walk('./content', function(err, results) {
  if (err) throw err;
  for ( var tr in results ) { // register all contents as templates
    var tfl = results[tr];
    var part = fs.readFileSync(tfl).toString();
    var fln = tfl.replace('./content/','').split('.')[0];
    templates.push(fln);
    handlebars.registerPartial(fln,part);
  }

  for ( var r in results ) { // for every content, build it
    var vars = {};
    try { vars = require('./vars.json'); } catch(err) {}
    var fl = results[r];
    var content = fs.readFileSync(fl).toString();
    if (content.indexOf('---') !== -1) {
      var pts = content.split('---');
      if (pts.length === 3) {
        var sets = pts[1];
        // parse sets for vars info
        content = pts[2];
      }
    }

    if (vars.header !== false && content.indexOf('<header') === -1) {
      if (vars.header === undefined && templates.indexOf('header') !== -1) vars.header = 'header';
      if (vars.header) content = '{{> ' + vars.header + ' }}' + '\n\n' + content;
    }
    if (vars.footer !== false && content.indexOf('<footer') === -1) {
      if (vars.footer === undefined && templates.indexOf('footer') !== -1) vars.footer = 'footer';
      if (vars.footer) content = content + '\n\n{{> ' + vars.footer + ' }}\n\n';
    }
    var extrahead = undefined;
    if ( content.indexOf('<head>') !== -1 ) {
      var pa = content.split('</head>');
      extrahead = pa[0].replace('<head>','');
      content = pa[1];
    }
    if (content.indexOf('<body') === -1) content = '<body>\n' + content + '\n</body>';
    if (vars.head !== false && content.indexOf('<head') === -1) {
      if (vars.head === undefined && templates.indexOf('head') !== -1) vars.head = 'head';
      if (vars.head) {
        content = '{{> ' + vars.head + ' }}' + '\n\n' + content;
      } else {
        content = '<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
<!-- Le HTML5 shim, for IE6-8 support of HTML elements -->\n\
<!--[if lt IE 9]>\n\
<script src="//static.cottagelabs.com/html5shim.min.js"></script>\n\
<![endif]-->\n</head>\n\n' + content;
      }
    }

    var template = handlebars.compile(content);
    content = template(vars);

    var marked;
    if ( fl.indexOf('.md') !== -1) {
      marked = require('marked');
      content = marked(content);
    } else if ( content.indexOf('<markdown>') !== -1 ) {
      marked = require('marked');
      var nc = '';
      var cp = content.split('<markdown>');
      for ( var a in cp ) {
        if (a === 0) {
          nc += cp[a];
        } else {
          var ms = cp[a].split('</markdown>');
          nc += marked(ms[0]) + ms[1];
        }
      }
      content = nc;
    }

    // insert the calls to the necessary js and css, and any extra head data provided in the page itself
    if (content.indexOf('<head') === -1) content = '\n<head>\n</head>\n\n' + content;
    if (csshash) content = content.replace('<head>','<head>\n<link rel="stylesheet" href="/static/bundle/' + csshash + '.min.css">\n');
    if (jshash) content = content.replace('<head>','<head>\n<script src="/static/bundle/' + jshash + '.min.js"></script>\n');
    if (extrahead) content = content.replace('</head>',extrahead + '\n</head>');

    var open, close;
    try { open = fs.readFileSync('./content/open.html').toString(); } catch(err) { open = '<!DOCTYPE html>\n<html dir="ltr" lang="en">\n'; }
    try { close = fs.readFileSync('./content/close.html').toString(); } catch(err) { close = '\n</html>'; }
    if ( content.indexOf('<html') === -1 ) content = open + content;
    if ( content.indexOf('</html') === -1 ) content = content + close;

    var dcp = fl.replace('./content/','').split('/');
    var dc = './serve';
    for ( var i = 0; i < dcp.length-1; i++ ) {
      dc += '/' + dcp[i];
      if (!fs.existsSync(dc)) fs.mkdirSync(dc);
    }
    fs.writeFileSync(fl.replace('./content/','./serve/').replace('.md','').replace('.html','')+'.html',content);

  }

  console.log("Files");
  console.log(results);
});








