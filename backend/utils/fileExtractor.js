const { spawn } = require('child_process');
const path = require('path');

const extractorScript = path.resolve(__dirname, 'text_extractor.py');

function extractTextFromFile(filePath, extension) {
  return new Promise((resolve, reject) => {
    const process = spawn('python', [extractorScript, filePath, extension]);
    let data = '';
    let err = '';

    process.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    process.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });

    process.on('close', (code) => {
      if (code !== 0) {
        console.error('extractTextFromFile error', err);
        return reject(new Error('Failed to extract text'));
      }
      resolve(data.trim());
    });
  });
}

module.exports = { extractTextFromFile };
