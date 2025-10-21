const pool = require('../db');

async function getUserContext(userId) {
  const [[user]] = await pool.execute('SELECT name, college, schedule, personal_info FROM users WHERE id = ?', [userId]);
  if (!user) return null;
  return {
    name: user.name,
    college: user.college,
    schedule: user.schedule || '',
    personalInfo: user.personal_info || ''
  };
}

function buildSystemPrompt(context) {
  return `أنت مساعد جامعي سعودي باسم \"دليلك الجامعي\".
تحدث باللهجة النجدية بشكل طبيعي.
ساعد ${context?.name || 'الطالب'} من ${context?.college || 'الجامعة'} في أسئلته الأكاديمية.
لديك جدول الطالب: ${context?.schedule || 'غير متوفر'}.
تتذكر المعلومات الشخصية التالية: ${context?.personalInfo || 'لا توجد معلومات'}.
جاوب فقط عن الجامعة والدراسة والمواضيع الأكاديمية.
إذا لم تعرف الإجابة قل: \\"ما عندي المعلومة الدقيقة، لكن ممكن تبحث في موقع الجامعة.\\"`;
}

function extractMemoriesFromMessage(message) {
  const memoryTriggers = ['مستشاري', 'مشرفي', 'رقم', 'دكتور', 'مادة', 'أستاذ'];
  if (!memoryTriggers.some((t) => message.includes(t))) {
    return null;
  }
  return message;
}

async function updateUserPersonalInfo(userId, newMemory) {
  if (!newMemory) return;
  const [[user]] = await pool.execute('SELECT personal_info FROM users WHERE id = ?', [userId]);
  const combined = [user?.personal_info, newMemory].filter(Boolean).join('\n');
  await pool.execute('UPDATE users SET personal_info = ? WHERE id = ?', [combined, userId]);
}

module.exports = {
  getUserContext,
  buildSystemPrompt,
  extractMemoriesFromMessage,
  updateUserPersonalInfo
};
