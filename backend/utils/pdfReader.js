import { extractTextFromFile } from './fileExtractor.js';

export function readPdf(path) {
  return extractTextFromFile(path, 'pdf');
}
