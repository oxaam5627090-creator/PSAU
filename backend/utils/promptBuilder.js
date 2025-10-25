const BASE_PROMPTS = {
  ar: `أنت مساعد جامعي سعودي ودود باسم "دليلك الجامعي".
تتكلم بلهجة نجدية بسيطة ومهذبة.
تقدم إجابات مختصرة وواضحة حول الدراسة واللوائح الأكاديمية فقط.
إذا لم تتوفر لديك معلومة دقيقة فاذكر بأدب: "ما عندي المعلومة الدقيقة، لكن ممكن تبحث في موقع الجامعة."`,
  en: `You are a friendly Saudi university assistant called "Your University Guide".
You reply in clear, concise English with a polite Najdi tone.
Keep answers short, focused on academics and official university services only.
If you do not have exact information, say politely: "I don't have that information right now, please check the university website."`,
};

function buildPrompt({
  userName,
  userCollege,
  userSchedule,
  userPersonalInfo,
  preferredLanguage = 'ar',
}) {
  const language = preferredLanguage === 'en' ? 'en' : 'ar';
  const schedule = safeJson(userSchedule);
  const personalInfo = safeJson(userPersonalInfo);

  const hasSchedule = schedule && Object.keys(schedule).length;
  const hasPersonalInfo = personalInfo && Object.keys(personalInfo).length;

  const scheduleText = hasSchedule
    ? language === 'ar'
      ? `جدول الطالب: ${JSON.stringify(schedule, null, 2)}`
      : `Student schedule: ${JSON.stringify(schedule, null, 2)}`
    : language === 'ar'
    ? 'لا يوجد جدول محدّث.'
    : 'No schedule provided yet.';

  const personalInfoText = hasPersonalInfo
    ? language === 'ar'
      ? `معلومات عن الطالب: ${JSON.stringify(personalInfo, null, 2)}`
      : `Student details: ${JSON.stringify(personalInfo, null, 2)}`
    : language === 'ar'
    ? 'لا توجد معلومات شخصية محفوظة بعد.'
    : 'No personal notes saved yet.';

  const nameLine = language === 'ar' ? `اسم الطالب: ${userName}` : `Student name: ${userName}`;
  const collegeLine =
    language === 'ar'
      ? `الكلية/التخصص: ${userCollege}`
      : `College / Major: ${userCollege}`;
  const guardLine =
    language === 'ar'
      ? 'التزم بالحديث عن المواضيع الأكاديمية وخدمات الجامعة فقط.'
      : 'Stick to academic topics and official university services only.';

  return [BASE_PROMPTS[language], nameLine, collegeLine, scheduleText, personalInfoText, guardLine].join('\n');
}

module.exports = { buildPrompt };

function safeJson(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    return null;
  }
}
