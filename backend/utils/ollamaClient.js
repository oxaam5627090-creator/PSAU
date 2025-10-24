const { config } = require('../config');

let cachedFetch;

class OllamaError extends Error {
  constructor(status, details) {
    const suffix = details ? `: ${details}` : '';
    super(`Ollama request failed (${status})${suffix}`);
    this.name = 'OllamaError';
    this.status = status;
    this.details = details;
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
      if (typeof parsed.message === 'string') {
        return parsed.message;
      }
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to the raw text.
  }

  return trimmed;
}

async function callOllama(body) {
  const fetch = await getFetch();
  const response = await fetch(`${config.ollama.host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OllamaError(response.status, extractErrorDetails(text));
  }

  const data = await response.json();
  return data;
}

async function streamOllama(body, onEvent) {
  const fetch = await getFetch();
  const response = await fetch(`${config.ollama.host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OllamaError(response.status, extractErrorDetails(text));
  }

  let buffer = '';

  const flushBuffer = (isFinal = false) => {
    if (!buffer) {
      return;
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

      try {
        onEvent(JSON.parse(payloadText));
      } catch (error) {
        console.warn('Ignoring malformed Ollama SSE payload:', payloadText, error);
      }
    }

    buffer = isFinal ? '' : remainder;
  };

  for await (const chunk of response.body) {
    buffer += chunk.toString();
    flushBuffer(false);
  }

  flushBuffer(true);
}

module.exports = { callOllama, streamOllama, OllamaError };
