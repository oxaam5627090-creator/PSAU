const PPTXParser = require('pptx-parser');

async function readPpt(filePath) {
  const parser = new PPTXParser();
  const { slides = [] } = await parser.parsePptx(filePath);
  const content = slides
    .map((slide, idx) => {
      const shapes = slide.content || [];
      const text = shapes
        .map((shape) => shape?.text || '')
        .filter(Boolean)
        .join(' ');
      return `شريحة ${idx + 1}: ${text}`;
    })
    .join('\n');
  return content;
}

module.exports = readPpt;
