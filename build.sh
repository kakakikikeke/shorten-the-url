rm -rf dist/*
mkdir -p dist
zip -r -FS ./dist/shorten-the-url.zip * --exclude '*.git*' '*package.json*' '*node_modules*' 'build.sh' '.eslintrc.js' '*dist*'
