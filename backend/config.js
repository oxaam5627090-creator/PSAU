const dotenv = require('dotenv');

dotenv.config();

function pickNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const llmProvider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
const llmModel =
  process.env.LLM_MODEL ||
  process.env.OLLAMA_MODEL ||
  'llama3.1:8b';

const sharedBaseUrl = process.env.LLM_BASE_URL || '';
const ollamaBaseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
const allamBaseUrl = process.env.ALLAM_BASE_URL || 'https://api.allam.world';
const apiKey = process.env.LLM_API_KEY || process.env.ALLAM_API_KEY || '';

const llmConfig = {
  provider: llmProvider,
  model: llmModel,
  baseUrl: sharedBaseUrl || ollamaBaseUrl,
  apiKey,
  temperature: pickNumber(process.env.LLM_TEMPERATURE),
  maxOutputTokens: pickNumber(process.env.LLM_MAX_OUTPUT_TOKENS),
  topP: pickNumber(process.env.LLM_TOP_P),
  transport: 'ollama',
};

if (llmProvider === 'allam') {
  const explicitBaseUrl = sharedBaseUrl || process.env.ALLAM_BASE_URL || '';
  const wantsRemoteApi = Boolean(apiKey) || /allam\.(world|ai)/i.test(explicitBaseUrl);

  if (wantsRemoteApi) {
    llmConfig.baseUrl = explicitBaseUrl || allamBaseUrl;
    llmConfig.transport = 'allam';
  } else {
    llmConfig.baseUrl = explicitBaseUrl || ollamaBaseUrl;
    llmConfig.transport = 'ollama';
  }
} else {
  llmConfig.baseUrl = sharedBaseUrl || ollamaBaseUrl;
  llmConfig.transport = 'ollama';
}

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
  llm: llmConfig,
  enableWebSearch: process.env.ENABLE_WEB_SEARCH === 'true',
  webSearchApiKey: process.env.WEB_SEARCH_API_KEY || '',
};

module.exports = { config };
