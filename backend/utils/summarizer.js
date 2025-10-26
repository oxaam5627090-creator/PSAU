const { callOllama } = require('./ollamaClient');
const { config } = require('../config');

async function summarizeConversation(history, language = 'ar') {
  const conversation = history
    .map((entry) => {
      const base = `${entry.role}: ${entry.content ?? ''}`;
      if (entry.attachments && entry.attachments.length) {
        const attachments = entry.attachments
          .map((attachment, index) => {
            const label = attachment.fileName || `Attachment ${index + 1}`;
            const type = attachment.fileType ? ` (${attachment.fileType})` : '';
            const text = attachment.extractedText ? ` -> ${attachment.extractedText}` : '';
            return `- ${label}${type}${text}`;
          })
          .join('\n');
        return `${base}\nالمرفقات:\n${attachments}`;
      }
      return base;
    })
    .join('\n');

  const isEnglish = language === 'en';
  const summaryPrompt = isEnglish
    ? `Summarize the following conversation into short bullet points in clear English. Focus on details that matter to the student (classes, advisors, deadlines).\n\n${conversation}\n\nSummary:`
    : `لخّص المحادثة التالية في نقاط بسيطة باللغة العربية الفصحى مع التركيز على المعلومات المهمة عن الطالب.\n\n${conversation}\n\nالخلاصة:`;

  try {
    const response = await callOllama({
      model: config.ollama.model,
      prompt: summaryPrompt,
      stream: false,
    });

    return response.message ?? response.response ?? '';
  } catch (error) {
    console.error('summarizeConversation error', error);
    return '';
  }
}

module.exports = { summarizeConversation };
