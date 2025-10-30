const { spawn } = require('child_process');
const path = require('path');

const extractorScript = path.resolve(__dirname, 'text_extractor.py');

class ExtractionError extends Error {
  constructor(message, exitCode, details) {
    super(message || 'Failed to extract text');
    this.name = 'ExtractionError';
    this.exitCode = exitCode;
    this.details = details;
  }
}

function parseExtractorError(output) {
  if (!output) {
    return '';
  }

  const trimmed = output.toString().trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to the raw trimmed message.
  }

  return trimmed;
}

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
        const details = parseExtractorError(err || data);
        const message = details || 'Failed to extract text';
        console.error('extractTextFromFile error', message);
        return reject(new ExtractionError(message, code, details));
      }
      resolve(data.trim());
    });
  });
}

module.exports = { extractTextFromFile, ExtractionError };
