const { extractTextFromFile } = require('./fileExtractor');

function readPpt(path) {
  return extractTextFromFile(path, 'ppt');
}

function readPptx(path) {
  return extractTextFromFile(path, 'pptx');
}

module.exports = { readPpt, readPptx };
