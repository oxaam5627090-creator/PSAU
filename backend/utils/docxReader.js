import { extractTextFromFile } from './fileExtractor.js';

export function readDocx(path) {
  return extractTextFromFile(path, 'docx');
}
