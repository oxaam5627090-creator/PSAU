const { PDFLoader } = require('langchain/document_loaders/fs/pdf');

async function readPdf(filePath) {
  const loader = new PDFLoader(filePath, {
    splitPages: false
  });
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join('\n');
}

module.exports = readPdf;
