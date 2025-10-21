const mammoth = require('mammoth');

async function readDocx(filePath) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value;
}

module.exports = readDocx;
