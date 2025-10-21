const BASE_PROMPT = `أنت مساعد جامعي سعودي ودود باسم "دليلك الجامعي".
تتكلم بلهجة نجدية بسيطة ومهذبة.
تقدم إجابات مختصرة وواضحة حول الدراسة واللوائح الأكاديمية فقط.
إذا لم تتوفر لديك معلومة دقيقة فاذكر بأدب: "ما عندي المعلومة الدقيقة، لكن ممكن تبحث في موقع الجامعة."`;

export function buildPrompt({
  userName,
  userCollege,
  userSchedule,
  userPersonalInfo,
  basePrompt = BASE_PROMPT,
}) {
  const schedule = safeJson(userSchedule);
  const personalInfo = safeJson(userPersonalInfo);

  const scheduleText = schedule && Object.keys(schedule).length
    ? `جدول الطالب: ${JSON.stringify(schedule, null, 2)}`
    : 'لا يوجد جدول محدّث.';

  const personalInfoText = personalInfo && Object.keys(personalInfo).length
    ? `معلومات عن الطالب: ${JSON.stringify(personalInfo, null, 2)}`
    : 'لا توجد معلومات شخصية محفوظة بعد.';

  return [
    basePrompt,
    `اسم الطالب: ${userName}`,
    `الكلية/التخصص: ${userCollege}`,
    scheduleText,
    personalInfoText,
    'التزم بالحديث عن المواضيع الأكاديمية وخدمات الجامعة فقط.',
  ].join('\n');
}

function safeJson(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    return null;
  }
}
