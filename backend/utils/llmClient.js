const { config } = require('../config');

let cachedFetch;

class LLMError extends Error {
  constructor(status, details, provider = config.llm?.provider) {
    const label = provider ? provider.toUpperCase() : 'LLM';
    const suffix = details ? `: ${details}` : '';
    super(`${label} request failed (${status})${suffix}`);
    this.name = 'LLMError';
    this.status = status;
    this.details = details;
    this.provider = provider;
  }
}

async function getFetch() {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  if (!cachedFetch) {
    const mod = await import('node-fetch');
    cachedFetch = mod.default || mod;
  }

  return cachedFetch;
}

function extractErrorDetails(raw) {
  if (!raw) {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.error === 'string') {
        return parsed.error;
      }
      if (parsed.error && typeof parsed.error.message === 'string') {
        return parsed.error.message;
      }
      if (typeof parsed.message === 'string') {
        return parsed.message;
      }
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to the raw text.
  }

  return trimmed;
}

function normalizeBaseUrl(url) {
  if (typeof url !== 'string') {
    return '';
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function resolveTransport() {
  const provider = (config.llm?.provider || 'ollama').toLowerCase();
  const transport = (config.llm?.transport || '').toLowerCase();

  if (provider === 'allam') {
    if (transport === 'allam' || transport === 'ollama') {
      return transport;
    }

    if (config.llm?.apiKey) {
      return 'allam';
    }

    const base = normalizeBaseUrl(config.llm?.baseUrl || '');
    if (/allam\.(world|ai)/i.test(base)) {
      return 'allam';
    }

    return 'ollama';
  }

  return 'ollama';
}

function pickNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasOllamaMessages(body = {}) {
  return Array.isArray(body.messages) && body.messages.length > 0;
}

function createOllamaRequestBody(body = {}, { stream, endpoint }) {
  const requestBody = {
    model: body.model || config.llm.model,
    stream,
  };

  if (endpoint === 'chat') {
    requestBody.messages = (body.messages || []).map((message) => ({
      role: message.role || 'user',
      content: typeof message.content === 'string' ? message.content : '',
    }));
  } else {
    requestBody.prompt = body.prompt || '';

    if (body.format) {
      requestBody.format = body.format;
    }

    if (Array.isArray(body.images) && body.images.length > 0) {
      requestBody.images = body.images;
    }

    if (body.keep_alive !== undefined) {
      requestBody.keep_alive = body.keep_alive;
    }

    if (body.context) {
      requestBody.context = body.context;
    }
  }

  const options = { ...(body.options || {}) };
  const temperature = pickNumber(body.temperature ?? config.llm.temperature);
  if (temperature !== undefined) {
    options.temperature = temperature;
  }

  const topP = pickNumber(body.topP ?? body.top_p ?? config.llm.topP);
  if (topP !== undefined) {
    options.top_p = topP;
  }

  const maxTokens = pickNumber(
    body.maxOutputTokens ?? body.num_predict ?? config.llm.maxOutputTokens
  );
  if (maxTokens !== undefined) {
    options.num_predict = maxTokens;
  }

  if (Object.keys(options).length > 0) {
    requestBody.options = options;
  }

  return requestBody;
}

function extractOllamaResponse(data) {
  if (!data) {
    return '';
  }

  if (typeof data.response === 'string') {
    return data.response;
  }

  if (data.message && typeof data.message.content === 'string') {
    return data.message.content;
  }

  if (typeof data.text === 'string') {
    return data.text;
  }

  return '';
}

function buildAllamMessages(body = {}) {
  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return body.messages.map((message) => ({
      role: message.role || 'user',
      content: typeof message.content === 'string' ? message.content : '',
    }));
  }

  const messages = [];
  if (typeof body.system === 'string' && body.system.trim()) {
    messages.push({ role: 'system', content: body.system });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (prompt) {
    messages.push({ role: 'user', content: prompt });
  }

  return messages;
}

function createAllamRequestBody(body = {}, { stream }) {
  const requestBody = {
    model: body.model || config.llm.model,
    messages: buildAllamMessages(body),
    stream,
  };

  const temperature = pickNumber(body.temperature ?? config.llm.temperature);
  if (temperature !== undefined) {
    requestBody.temperature = temperature;
  }

  const topP = pickNumber(body.topP ?? body.top_p ?? config.llm.topP);
  if (topP !== undefined) {
    requestBody.top_p = topP;
  }

  const maxTokens = pickNumber(body.maxOutputTokens ?? config.llm.maxOutputTokens);
  if (maxTokens !== undefined) {
    requestBody.max_output_tokens = maxTokens;
  }

  if (Array.isArray(body.stop) && body.stop.length > 0) {
    requestBody.stop = body.stop;
  }

  return requestBody;
}

function extractAllamResponse(data) {
  if (!data) {
    return '';
  }

  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    if (choice && choice.message && typeof choice.message.content === 'string') {
      return choice.message.content;
    }
    if (choice && choice.delta && typeof choice.delta.content === 'string') {
      return choice.delta.content;
    }
  }

  if (typeof data.text === 'string') {
    return data.text;
  }

  if (typeof data.response === 'string') {
    return data.response;
  }

  return '';
}

async function callOllama(body = {}) {
  const fetch = await getFetch();
  const baseUrl = normalizeBaseUrl(config.llm.baseUrl || 'http://localhost:11434');
  const hasMessages = hasOllamaMessages(body);
  const endpoint = hasMessages ? 'chat' : 'generate';
  const requestBody = createOllamaRequestBody(body, { stream: false, endpoint });

  const response = await fetch(`${baseUrl}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LLMError(response.status, extractErrorDetails(text));
  }

  const data = await response.json();
  const text = extractOllamaResponse(data);
  return { response: text, message: text, raw: data };
}

async function streamOllama(body = {}, onEvent) {
  const fetch = await getFetch();
  const baseUrl = normalizeBaseUrl(config.llm.baseUrl || 'http://localhost:11434');
  const hasMessages = hasOllamaMessages(body);
  const endpoint = hasMessages ? 'chat' : 'generate';
  const requestBody = createOllamaRequestBody(body, { stream: true, endpoint });

  const response = await fetch(`${baseUrl}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LLMError(response.status, extractErrorDetails(text));
  }

  await parseNdjsonStream(response, (payloadText) => {
    try {
      const parsed = JSON.parse(payloadText);

      if (parsed.done) {
        onEvent({ done: true });
        return;
      }

      if (typeof parsed.response === 'string' && parsed.response) {
        onEvent({ response: parsed.response });
        return;
      }

      if (
        parsed.message &&
        typeof parsed.message.content === 'string' &&
        parsed.message.content
      ) {
        onEvent({ response: parsed.message.content });
      }
    } catch (error) {
      console.warn('Ignoring malformed Ollama stream payload:', payloadText, error);
    }
  });
}

async function callAllam(body = {}) {
  const fetch = await getFetch();
  const baseUrl = normalizeBaseUrl(config.llm.baseUrl || 'https://api.allam.world');
  const requestBody = createAllamRequestBody(body, { stream: false });

  const headers = { 'Content-Type': 'application/json' };
  if (config.llm.apiKey) {
    headers.Authorization = `Bearer ${config.llm.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LLMError(response.status, extractErrorDetails(text));
  }

  const data = await response.json();
  const text = extractAllamResponse(data);
  return { response: text, message: text, raw: data };
}

async function streamAllam(body = {}, onEvent) {
  const fetch = await getFetch();
  const baseUrl = normalizeBaseUrl(config.llm.baseUrl || 'https://api.allam.world');
  const requestBody = createAllamRequestBody(body, { stream: true });

  const headers = { 'Content-Type': 'application/json' };
  if (config.llm.apiKey) {
    headers.Authorization = `Bearer ${config.llm.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LLMError(response.status, extractErrorDetails(text));
  }

  let doneSent = false;
  await parseSseStream(response, (payloadText) => {
    if (payloadText === '[DONE]') {
      doneSent = true;
      onEvent({ done: true });
      return;
    }

    try {
      const parsed = JSON.parse(payloadText);
      if (Array.isArray(parsed.choices)) {
        for (const choice of parsed.choices) {
          const delta = choice.delta || {};
          if (typeof delta.content === 'string' && delta.content) {
            onEvent({ response: delta.content });
          }
          if (choice.finish_reason && !doneSent) {
            doneSent = true;
            onEvent({ done: true, finishReason: choice.finish_reason });
          }
        }
      }
    } catch (error) {
      console.warn('Ignoring malformed Allam SSE payload:', payloadText, error);
    }
  });

  if (!doneSent) {
    onEvent({ done: true });
  }
}

async function parseSseStream(response, handlePayload) {
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += chunk.toString();
    buffer = flushSseBuffer(buffer, handlePayload, false);
  }
  flushSseBuffer(buffer, handlePayload, true);
}

function flushSseBuffer(buffer, handlePayload, isFinal) {
  if (!buffer) {
    return '';
  }

  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const segments = normalized.split(/\n{2,}/);
  const remainder = isFinal ? '' : segments.pop() ?? '';

  for (const segment of segments) {
    if (!segment.trim()) {
      continue;
    }

    const dataLines = [];
    for (const rawLine of segment.split('\n')) {
      const line = rawLine.trimEnd();
      if (!line || line.startsWith(':')) {
        continue;
      }

      if (line.startsWith('data:')) {
        let value = line.slice(5);
        if (value.startsWith(' ')) {
          value = value.slice(1);
        }
        dataLines.push(value);
      }
    }

    if (!dataLines.length) {
      continue;
    }

    const payloadText = dataLines.join('\n').trim();
    if (!payloadText) {
      continue;
    }

    handlePayload(payloadText);
  }

  return remainder;
}

async function parseNdjsonStream(response, handlePayload) {
  let buffer = '';

  for await (const chunk of response.body) {
    buffer += chunk.toString();
    buffer = flushNdjsonBuffer(buffer, handlePayload, false);
  }

  flushNdjsonBuffer(buffer, handlePayload, true);
}

function flushNdjsonBuffer(buffer, handlePayload, isFinal) {
  let working = buffer;

  while (true) {
    const newlineIndex = working.indexOf('\n');
    if (newlineIndex === -1) {
      break;
    }

    const line = working.slice(0, newlineIndex).trim();
    working = working.slice(newlineIndex + 1);

    if (!line) {
      continue;
    }

    handlePayload(line);
  }

  if (isFinal) {
    const finalLine = working.trim();
    if (finalLine) {
      handlePayload(finalLine);
    }
    return '';
  }

  return working;
}

async function callLLM(body = {}) {
  const provider = (config.llm.provider || 'ollama').toLowerCase();
  if (provider === 'allam') {
    const transport = resolveTransport();
    if (transport === 'allam') {
      return callAllam(body);
    }
    if (transport === 'ollama') {
      return callOllama(body);
    }
  }

  if (provider === 'ollama') {
    return callOllama(body);
  }

  throw new LLMError(400, `Unsupported LLM provider: ${provider}`);
}

async function streamLLM(body = {}, onEvent) {
  const provider = (config.llm.provider || 'ollama').toLowerCase();
  if (provider === 'allam') {
    const transport = resolveTransport();
    if (transport === 'allam') {
      return streamAllam(body, onEvent);
    }
    if (transport === 'ollama') {
      return streamOllama(body, onEvent);
    }
  }

  if (provider === 'ollama') {
    return streamOllama(body, onEvent);
  }

  throw new LLMError(400, `Unsupported LLM provider: ${provider}`);
}

module.exports = {
  callLLM,
  streamLLM,
  LLMError,
  // Backwards compatibility exports
  callOllama: callLLM,
  streamOllama: streamLLM,
};
