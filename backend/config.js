require('dotenv').config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const STORAGE_PATH = process.env.STORAGE_PATH || `${__dirname}/uploads`;
const UPLOAD_TTL_DAYS = Number(process.env.UPLOAD_TTL_DAYS || 7);

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3.2:3b-instruct-q4';

module.exports = {
  PORT,
  CLIENT_URL,
  STORAGE_PATH,
  UPLOAD_TTL_DAYS,
  OLLAMA_HOST,
  MODEL_NAME
};
