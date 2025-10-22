const { config } = require('../config');

let cachedFetch;

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

async function callOllama(body) {
  const fetch = await getFetch();
  const response = await fetch(`${config.ollama.host}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error: ${response.status} ${text}`);
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
    throw new Error(`Ollama error: ${response.status} ${text}`);
  }

  let buffer = '';
  for await (const chunk of response.body) {
    buffer += chunk.toString();

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        onEvent(JSON.parse(line));
      }
      newlineIndex = buffer.indexOf('\n');
    }
  }

  const trimmed = buffer.trim();
  if (trimmed) {
    onEvent(JSON.parse(trimmed));
  }
}

module.exports = { callOllama, streamOllama };
