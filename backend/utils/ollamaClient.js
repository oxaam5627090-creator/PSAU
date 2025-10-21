const axios = require('axios');
const { OLLAMA_HOST, MODEL_NAME } = require('../config');

async function generateChatCompletion({ systemPrompt, messages }) {
  const payload = {
    model: MODEL_NAME,
    stream: false,
    options: {
      temperature: 0.6,
      top_p: 0.9,
      num_ctx: 6000
    },
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  };

  const { data } = await axios.post(`${OLLAMA_HOST}/api/chat`, payload, {
    headers: { 'Content-Type': 'application/json' }
  });

  const answer = data?.message?.content || '';
  return answer.trim();
}

module.exports = {
  generateChatCompletion
};
