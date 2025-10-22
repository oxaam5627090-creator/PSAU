const { extractTextFromFile } = require('./fileExtractor');

function readDocx(path) {
  return extractTextFromFile(path, 'docx');
}

module.exports = { readDocx };
