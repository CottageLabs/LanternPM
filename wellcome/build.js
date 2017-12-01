// Build static files to serve. Put file templates in a content folder, and use handlebars if necessary.
// Content templates can be .html or .md (in which case marked is also required). html files can
// also included markdown sections in <markdown></markdown> tags.

// Requires fs and handlebars - handlebars syntax can be used to include files in other files.

// If a settings.json file is included and if it has a bundle list, then crypto, sync-request,
// uglify-js (2.x, such as 2.8.29), uglifycss are required
// the bundle list should contain a list of string routes to local js or css files in ./static/
// or URLs starting with http which will be retrieved into the local static folder.
// All files listed in the bundle will then be combined into a minified js file and minified css file.

// To compile scss to css sass is also required to be installed, and similarly to compile .coffee files or
// coffeescript in <script> tags in the html, coffee must be installed.

// Special templates are optional, called open, head, header, footer, close.
// open and close customise the opening and closing html tags if necessary.
// header and footer can be defined to be included in every content file, even if not explicitly included.
// head can contain a custom head if required. Any content template can also include a
// head section which will be combined into the main head section. Tags to retrieve the bundled css and js
// files will be added to the rendered pages just above the first script tag found within the content if any,
// or else at the bottom of the content.

// If there is a local settings.json file, it will be searched for variables to inject into any handlebars
// variables found in the content files, as well as the build overrides and bundle list.

// A local.json file can also be provided, which should not get checked in to git, and can contain secret
// variables that should not be publicly shared, or settings that should only be used locally. Any keys found
// in local.json will shallow overwrite into settings.json

// Static files should be placed in the static folder. Any files in here that are
// not included in settings.json bundle can just be called in the normal way from the content files, if necessary.

// Generated / retrieved content will be placed in a folder called serve which gets emptied on every build.

// Use something like the example nginx config provided to serve files.

// To route requests for particular item pages, e.g. a given widget in a set of widgets, use the aforementioned
// nginx config and in the content/widgets folder create a content template called item.html. That template can
// then be rendered via a call to a URL like /widgets/widget1. The template must include the necessary js code
// to get the item specified in the URL string from some widgets API, and render it into the page.

var help = {
  dev: 'true/false* if true bundle values are inserted into head, no retrieval, no bundling',
  bundle: 'true*/false if true new js and css minified bundle files are created from everything listed in bundle.json',
  retrieve: 'true*/false if true any remote files listed in bundle.json will be retrieved before bundling, if false but some have been retrieved in a previous attempt, they will be reused in the bundle',
  sass: 'true*/false if true will look for any .scss files in static and generate a css file equivalent, and bundle.json scss files will use css instead',
  coffee: 'true*/false will look for any .coffee files and convert them to js in the serve/static folder, then those will be included in the bundle'
}
var args = {
  dev: false,
  bundle: true,
  retrieve: true,
  sass: true,
  coffee: true
}
var vars = {};
try { vars = require('./settings.json'); } catch (err) {}
try {
  var loc = require('./local.json');
  for ( var k in loc ) vars[k] = loc[k];
} catch (err) {}
var bundle;
try { bundle = vars.bundle; } catch (err) {}
if (vars && vars.build && vars.build.args) {
  console.log('Updating args from vars');
  for (var va in vars.build.args) args[va] = vars.build.args[va];
}
for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '-help') {
    console.log(help);
    console.log(args);
    return;
  }
  if (process.argv[i].indexOf('-') === 0) {
    var a = process.argv[i].replace('-', '');
    if (a.indexOf('no') === 0 && args[a.replace('no', '')] !== undefined) {
      args[a.replace('no', '')] = false;
    } else if (args[a] === undefined) {
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
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index) {
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
if (!fs.existsSync('./serve')) fs.mkdirSync('./serve');
fs.readdirSync('./serve/').forEach(function(n, index) {
  if ((n !== 'static' && n !== 'retrieved') || (n === 'static' && args.bundle) || (n === 'retrieved' && args.retrieve)) {
    if (fs.lstatSync('./serve/' + n).isDirectory()) {
      deleteFolderRecursive('./serve/' + n);
    } else {
      fs.unlinkSync('./serve/' + n);
    }
  }
});
if (!fs.existsSync('./serve/static')) fs.mkdirSync('./serve/static');
if (!fs.existsSync('./serve/retrieved')) fs.mkdirSync('./serve/retrieved');

var sass, coffee, jshash, csshash;
console.log(bundle);
if (!args.dev && args.bundle && bundle && typeof bundle === 'object') {
  var request, uglyjs, uglycss;
  var crypto = require('crypto');
  var js = [];
  var css = [];
  for (var b in bundle) {
    if (bundle[b].indexOf('http') === 0 && args.retrieve) {
      var url = bundle[b];
      bundle[b] = './serve/retrieved/' + bundle[b].split('/').pop();
      if (request === undefined) request = require('sync-request');
      var res = request('GET', url);
      var cb = res.getBody().toString();
      if (cb.indexOf('url(') !== -1) {
        var ncb = '';
        var cbpts = cb.split('url(');
        for (var c in cbpts) {
          if (c === '0') {
            ncb += cbpts[c];
          } else {
            var qtp = cbpts[c].indexOf('"') === 0 ? '"' : (cbpts[c].indexOf("'") === 0 ? "'" : '');
            var orurl = cbpts[c].replace(qtp, '').split(qtp + ')')[0].split('?')[0].split('#')[0];
            var csurl = orurl;
            var csfn = csurl.split('/').pop();
            if (csurl.indexOf('http') !== 0) {
              var pieces = csurl.split('/');
              var sourceparts = url.split('/');
              var tgt = '';
              for (var cp in pieces) {
                if (pieces[cp] !== '.' && pieces[cp] !== '..' && pieces[cp].length) {
                  tgt += '/' + pieces[cp];
                  sourceparts.pop();
                }
              }
              csurl = sourceparts.join('/') + tgt;
            }
            if (!fs.existsSync('./serve/static/' + csfn)) {
              console.log('Getting ' + csurl + ' as ' + csfn + ' for ' + url);
              var csres = request('GET', csurl);
              fs.writeFileSync('./serve/static/' + csfn, csres.getBody());
            }
            ncb += 'url(' + qtp + './' + csfn + cbpts[c].split(orurl)[1];
          }
        }
        cb = ncb;
      }
      if (bundle[b].indexOf('.scss') !== -1 && args.sass) {
        console.log('Sass rendering retrieved ' + bundle[b] + ' for bundle');
        if (sass === undefined) sass = require('node-sass');
        cb = sass.renderSync({ data: cb }).css;
        bundle[b] = bundle[b].replace('.scss', '.css');
      }
      if (bundle[b].indexOf('.coffee') !== -1 && args.coffee) {
        console.log('Coffee compiling ' + bundle[b] + ' for bundle');
        if (coffee === undefined) coffee = require('coffeescript');
        cb = coffee.compile(cb);
        bundle[b] = bundle[b].replace('.coffee', '.js');
      }
      fs.writeFileSync(bundle[b].replace('.coffee','.js'), cb);
    } else if (bundle[b].indexOf('http') === 0 && fs.existsSync('./serve/retrieved/' + bundle[b].split('/').pop())) {
      bundle[b] = './serve/retrieved/' + bundle[b].split('/').pop();
    }
    if ((bundle[b].indexOf('.css') !== -1 || bundle[b].indexOf('.scss') !== -1) && args.sass && fs.existsSync(bundle[b].replace('.css', '.scss'))) {
      console.log('Sass rendering ' + bundle[b] + ' for bundle');
      if (sass === undefined) sass = require('node-sass');
      var csres = sass.renderSync({ file: bundle[b].replace('.css', '.scss') }).css;
      fs.writeFileSync(bundle[b], csres);
      css.push(bundle[b]);
    } else if ((bundle[b].indexOf('.js') !== -1 || bundle[b].indexOf('.coffee') !== -1) && args.coffee && fs.existsSync(bundle[b].replace('.js', '.coffee'))) {
      console.log('Coffee rendering ' + bundle[b] + ' for bundle');
      if (coffee === undefined) coffee = require('coffeescript');
      var cores = coffee.compile(fs.readFileSync(bundle[b].replace('.js', '.coffee')).toString());
      fs.writeFileSync(bundle[b].replace('.coffee','.js'), cores);
      js.push(bundle[b].replace('.coffee','.js'));
    } else if (fs.existsSync(bundle[b])) {
      bundle[b].indexOf('.js') !== -1 ? js.push(bundle[b]) : css.push(bundle[b].replace('.scss', 'css'));
    } else {
      console.log('COULD NOT RETRIEVE ' + bundle[b]);
    }
  }
  if (js.length) {
    var uglify = require("uglify-js");
    uglyjs = uglify.minify(js);
    jshash = crypto.createHash('md5').update(uglyjs.code).digest("hex");
    fs.writeFileSync('./serve/static/' + jshash + '.min.js', uglyjs.code);
  }
  if (css.length) {
    var uglifycss = require('uglifycss');
    uglycss = uglifycss.processFiles(css);
    csshash = crypto.createHash('md5').update(uglycss).digest("hex");
    fs.writeFileSync('./serve/static/' + csshash + '.min.css', uglycss);
  }
}

if (!args.dev && !args.bundle && jshash === undefined && csshash === undefined) {
  fs.readdirSync('./serve/static/').forEach(function(file, index) {
    if (file.indexOf('.min.js') !== -1 && jshash === undefined) jshash = file.replace('.min.js', '');
    if (file.indexOf('.min.css') !== -1 && csshash === undefined) csshash = file.replace('.min.css', '');
  });
}

// TODO this and above walk through bundle need to start taking account of folders inside static, not just top level files
if (args.sass || args.coffee) {
  // render anything in static that was not already done for bundle
  walk('./static', function(err, results) {
    for (var sr in results) {
      if (results[sr].indexOf('.scss') !== -1 || results[sr].indexOf('.coffee') !== -1) {
        if (bundle && typeof bundle === 'object') {
          if (bundle.indexOf(results[sr]) === -1 && bundle.indexOf(results[sr].replace('.scss', '.css').replace('.coffee', '.js')) === -1) {
            if (results[sr].indexOf('.scss') !== -1 && args.sass) {
              console.log('Sass compiling ' + results[sr]);
              if (sass === undefined) sass = require('node-sass');
              var sassres = sass.renderSync({ file: results[sr] }).css;
              fs.writeFileSync(results[sr].replace('./static', './serve/static').replace('.scss', '.css'), sassres);
            } else if (args.coffee) {
              console.log('Coffee compiling ' + results[sr]);
              if (coffee === undefined) coffee = require('coffeescript');
              var coffeeres = coffee.compile(fs.readFileSync(results[sr]).toString());
              fs.writeFileSync(results[sr].replace('./static', './serve/static').replace('.coffee', '.js'), coffeeres);
            }
          }
        }
      }
    }
  });
}

var handlebars = require('handlebars');
var templates = [];
walk('./content', function(err, results) {
  if (err) throw err;
  var headerhead = '';
  for (var tr in results) { // register all contents as templates
    var tfl = results[tr];
    var part = fs.readFileSync(tfl).toString();
    var fln = tfl.replace('./content/', '').split('.')[0];
    if (fln === 'header' && part.indexOf('<head>') !== -1) {
      var ph = part.split('</head>');
      headerhead = ph[0].replace('<head>', '');
      part = ph[1];
    }
    templates.push(fln);
    handlebars.registerPartial(fln, part);
  }

  for (var r in results) { // for every content, build it
    var fl = results[r];
    if (['open', 'head', 'header', 'footer', 'close'].indexOf(fl.replace('./content/', '').split('.')[0]) === -1) {
      var content = fs.readFileSync(fl).toString();
      if (content.indexOf('---') !== -1) {
        var pts = content.split('---');
        if (pts.length === 3) {
          //var sets = pts[1];
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

      var extrahead = '';
      if (content.indexOf('<head>') !== -1) {
        var pa = content.split('</head>');
        extrahead = pa[0].replace('<head>', '');
        content = pa[1];
      }
      extrahead = headerhead + extrahead;
      if (content.indexOf('<body') === -1) content = '<body>\n' + content + '\n</body>';
      if (vars.head !== false && content.indexOf('<head') === -1) {
        if (vars.head === undefined && templates.indexOf('head') !== -1) vars.head = 'head';
        if (vars.head) {
          content = '{{> ' + vars.head + ' }}' + '\n\n' + content;
        } else {
          content = '<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>\n\n' + content;
        }
      }
      //template = handlebars.compile(content);
      //content = template(vars);

      /*      var marked;
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
      */
      if (extrahead) content = content.replace('</head>', extrahead + '\n</head>');

      var open, close;
      try { open = fs.readFileSync('./content/open.html').toString(); } catch (err) { open = '<!DOCTYPE html>\n<html dir="ltr" lang="en">\n'; }
      try { close = fs.readFileSync('./content/close.html').toString(); } catch (err) { close = '\n</html>'; }
      if (content.indexOf('<html') === -1) content = open + content;
      if (content.indexOf('</html') === -1) content = content + close;

      template = handlebars.compile(content);
      content = template(vars);

      // insert the calls to the necessary js and css
      if (content.indexOf('<head') === -1) content = content.replace('<body', '\n<head>\n</head>\n\n<body');
      if (csshash) content = content.replace('<head>', '<head>\n<link rel="stylesheet" href="/static/' + csshash + '.min.css">\n');
      if (jshash) {
        if (content.indexOf('<script') !== -1) {
          content = content.replace('<script', '\n<script src="/static/' + jshash + '.min.js"></script>\n<script');
        } else {
          content = content.replace('<head>', '<head>\n<script src="/static/' + jshash + '.min.js"></script>\n');
        }
      }
      if (args.dev && args.bundle && bundle && typeof bundle === 'object') {
        for (var bn in bundle) {
          var bdr = args.retrieve ? bundle[bn] : (fs.existsSync('./serve/retrieved/' + bundle[bn].split('/').pop()) ? './serve/retrieved/' + bundle[bn].split('/').pop() : bundle[bn]);
          if (bundle[bn].indexOf('.js') !== -1) {
            content = content.replace('</head>', '<script src="' + bdr + '"></script>\n</head>');
          } else {
            content = content.replace('</head>', '<link rel="stylesheet" href="' + bdr + '">\n</head>');
          }
        }
      }

      if (content.toLowerCase().indexOf('<!doctype html>') === 0 && content.indexOf('html5shim') === -1) {
        content = content.replace('<head>','<head>\n\
<!-- Le HTML5 shim, for IE6-8 support of HTML elements -->\n\
<!--[if lt IE 9]>\n\
<script src="//static.cottagelabs.com/html5shim.min.js"></script>\n\
<![endif]-->\n');
      }

      var marked;
      if (fl.indexOf('.md') !== -1) {
        marked = require('marked');
        content = marked(content);
      } else if (content.indexOf('<markdown>') !== -1) {
        marked = require('marked');
        var nc = '';
        var cp = content.split('<markdown>');
        for (var a in cp) {
          if (a === '0') {
            nc += cp[a];
          } else {
            var ms = cp[a].split('</markdown>');
            nc += marked(ms[0]) + ms[1];
          }
        }
        content = nc;
      }

      content = content.replace(/\<coffeescript\>/g, '<script type="text/coffeescript">');
      content = content.replace(/\<\/coffeescript\>/g, '</script>');
      if (args.coffee && content.indexOf('<script type="text/coffeescript">') !== -1) {
        if (coffee === undefined) coffee = require('coffeescript');
        var cc = '';
        var ccp = content.split('<script type="text/coffeescript">');
        for (var c in ccp) {
          if (c === '0') {
            cc += ccp[c];
          } else {
            cc += '<script>';
            var cos = ccp[c].split('</script>');
            cc += coffee.compile(cos[0]) + '</script>' + cos[1];
          }
        }
        content = cc;
      }

      var dcp = fl.replace('./content/', '').split('/');
      var dc = './serve';
      for (var i = 0; i < dcp.length - 1; i++) {
        dc += '/' + dcp[i];
        if (!fs.existsSync(dc)) fs.mkdirSync(dc);
      }
      fs.writeFileSync(fl.replace('./content/', './serve/').replace('.md', '').replace('.html', '') + '.html', content);
    }
  }

  console.log("Files");
  console.log(results);
});
