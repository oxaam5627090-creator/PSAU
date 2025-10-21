const { createWorker } = require('tesseract.js');

async function runOcr(imagePath, lang = 'ara') {
  const worker = await createWorker(lang);
  try {
    const {
      data: { text }
    } = await worker.recognize(imagePath);
    return text;
  } finally {
    await worker.terminate();
  }
}

module.exports = runOcr;
