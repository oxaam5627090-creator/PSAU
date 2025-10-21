import { extractTextFromFile } from './fileExtractor.js';

export function readPpt(path) {
  return extractTextFromFile(path, 'ppt');
}

export function readPptx(path) {
  return extractTextFromFile(path, 'pptx');
}
