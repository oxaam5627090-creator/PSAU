import { extractTextFromFile } from './fileExtractor.js';

export function readImage(path) {
  return extractTextFromFile(path, 'png');
}
