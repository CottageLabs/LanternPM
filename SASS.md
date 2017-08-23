SASS required to compile theme.scss.  In python this is:

    pip install sass

Then to compile, e.g. from the python command line:
    
    import sass
    with open("lantern/static/theme.css", "w") as f: 
        f.write(sass.compile(filename="lantern/static/theme.scss"))

For other languages, frameworks, etc, see: http://sass-lang.com/libsass