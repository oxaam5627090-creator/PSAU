const { extractTextFromFile } = require('./fileExtractor');

function readImage(path) {
  return extractTextFromFile(path, 'png');
}

module.exports = { readImage };
