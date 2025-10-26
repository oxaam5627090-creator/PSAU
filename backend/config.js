const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'psau_admin',
    password: process.env.DB_PASSWORD || 'psau_password',
    database: process.env.DB_NAME || 'psau_ai_assistant',
  },
  uploadsDir: process.env.UPLOADS_DIR || 'backend/uploads',
  uploadLimitMb: process.env.UPLOAD_LIMIT_MB ? Number(process.env.UPLOAD_LIMIT_MB) : 2.5,
  memoryTokenLimit: process.env.MEMORY_TOKEN_LIMIT ? Number(process.env.MEMORY_TOKEN_LIMIT) : 6000,
  ollama: {
    host: process.env.OLLAMA_HOST || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  },
  enableWebSearch: process.env.ENABLE_WEB_SEARCH === 'true',
  webSearchApiKey: process.env.WEB_SEARCH_API_KEY || '',
};

module.exports = { config };
