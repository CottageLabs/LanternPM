This is a static site generator used with the example config provided.

In this case there are two sites in this repo, so the following instructions refer to the subfolders for each site (lantern and wellcome).

Write page fragments into the content directory. Files should have .html or .md or no suffixes. Hierarchy of served site is as per found 
in the content directory, where the root is from within that directory. So content/index.html is your standard homepage.

Write templates into the templates directory.

Put static files in the static directory.

When happy, run node build.js

(To get it to work you will have to install node on your system, and it requires fs, crypto, uglify-js, uglifycss, handlebars, and marked. 
Installing node is just a one-liner usually, and then installing the packages with npm is very straighforward too, just google it. For 
easiest approach install globally with sudo.)

This generates a serve folder full of complete static html pages that you can use and view as normal.

DO NOT PUT ANYTHING IMPORTANT IN THE SERVE FOLDER, IT WILL GET OVEWRITTEN EVERY TIME.

Tricks:

There are tricks to building the page fragments, and these are in progress of being developed. 
There is enough working now to make most static pages conveniently. Here is what you need to know:

If there is a template called head.html it will be automatically included in generating all page fragments.

BUT you can override that behaviour by including head tags in your fragment. OR you can use tags named extrahead 
to add head info that will be added to the default head template.

If there are templates called header and/or footer they will also always be included in page generations.

BUT you can override that by including header and/or footer tags anywhere in your fragment.

So for example if you want to build completely your own static page with nothing in common with the other pages, 
just make a normal html page wherever in the content directory you want it, and it will be copied as is to the 
serve directory.

Coming soon:

Settings configs within the templates, full handlebars templating syntax, automatic bundling, minifying, and versioning of js and css files.

This build concept was an evolution of getter, which was totally dynamic. That gave some nicer features in terms of how quick a fragment could 
be developed and viewed, and how easily they could be stitched together to build pages via calls direct from the browser. Some of these features 
will be integrated in, so that build/getter will work in a complementary fashion.

Why?

There are lots of other softwares out there that do this sort of thing. But none of them did it quite how I wanted, or they introduced a lot of 
extra overhead that I did not need. So I made my own. All it needs is node, which I use anyway, but that is easy to install even if you don't use it.



