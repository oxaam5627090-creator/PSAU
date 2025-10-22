const { extractTextFromFile } = require('./fileExtractor');

function readPdf(path) {
  return extractTextFromFile(path, 'pdf');
}

module.exports = { readPdf };
