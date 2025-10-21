# Saudi Academic AI Assistant

منصة محلية تعمل عبر نموذج لغة صغير مخصص لجامعات السعودية. المشروع مهيأ للتشغيل على Windows 11 مع WSL، ويتضمن واجهة ويب، إدارة مستخدمين، ذاكرة شخصية، وعمليات Fine-tuning باستخدام LoRA/QLoRA على مستندات الجامعة.

## نظرة سريعة على المجلدات

```
/ai-assistant/
├── backend/             # خادم Express + MySQL + تكامل Ollama
├── frontend/            # تطبيق React (Vite)
├── models/              # النماذج الأساسية والمعدّلة
├── data/university_docs # مصادر التدريب الرسمية
├── database/schema.sql  # تعريف قاعدة البيانات MySQL
└── README.md            # هذا الملف
```

## 1. المتطلبات المسبقة

- Windows 11 مع WSL2 (Ubuntu موصى به).
- Node.js 20+ و NPM.
- Python 3.10+ و pip داخل WSL.
- MySQL Server (محلي أو Docker).
- [Ollama](https://ollama.ai) أو [LM Studio](https://lmstudio.ai) لتشغيل النموذج.
- بطاقة GTX 1080 Ti مع ذاكرة 11GB (ينصح بوضعية Q4 للنموذج 3B/7B).

## 2. إعداد قاعدة البيانات

1. أنشئ قاعدة البيانات والجداول:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. أنشئ مستخدم MySQL مخصص:
   ```sql
   CREATE USER 'psau_user'@'%' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON psau_ai.* TO 'psau_user'@'%';
   FLUSH PRIVILEGES;
   ```

## 3. إعداد الخادم الخلفي (Backend)

```bash
cd backend
npm install
cp ../.env.example .env   # عدّل الملف لاحقاً
npm run dev
```

### ملف البيئة `.env`

انسخ المثال التالي وضعه في جذر المشروع:

```
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=psau_user
DB_PASSWORD=strong_password
DB_NAME=psau_ai
JWT_SECRET=super-secret-key
OLLAMA_HOST=http://localhost:11434
MODEL_NAME=llama3.2:3b-instruct-q4
UPLOAD_TTL_DAYS=7
```

> **ملاحظة:** يدعم الخادم استخدام LM Studio عبر تغيير `OLLAMA_HOST` إلى عنوان الخادم الخاص به.

## 4. إعداد الواجهة الأمامية (Frontend)

```bash
cd frontend
npm install
npm run dev
```

ستعمل الواجهة على العنوان <http://localhost:5173> مع Proxy تلقائي إلى الخادم الخلفي.

## 5. تشغيل النموذج عبر Ollama

1. ثبّت النموذج المطلوب:
   ```bash
   ollama pull llama3.2:3b-instruct-q4
   ```
2. تأكد من تشغيل خدمة Ollama:
   ```bash
   ollama serve
   ```
3. جرّب طلباً بسيطاً للتحقق:
   ```bash
   curl http://localhost:11434/api/generate -d '{"model":"llama3.2:3b-instruct-q4","prompt":"مرحبا"}'
   ```

## 6. الذاكرة الشخصية وإدارة المحادثات

- يتم تخزين المحادثات في جدول `chats` على شكل JSON.
- يتم استخراج المعلومات الشخصية التلقائية (مثل اسم المشرف أو مواعيد المحاضرات) وإضافتها إلى حقل `personal_info` للمستخدم.
- عند تجاوز 6000 رمز يمكن إنشاء مهمة cron لتقليص الذاكرة (موجودة كخطاف مبدئي في `utils/memory.js`).

## 7. رفع الملفات ومعالجتها

- يتم حفظ الملفات في `backend/uploads/<user_id>` مع حد أقصى 2.5MB لكل ملف.
- يتم استخدام PyMuPDF وLangChain للـ PDF، ومكتبات docx/ppt وTesseract للصور.
- تأكد من تثبيت التبعيات Python في WSL:
  ```bash
  pip install -r requirements.txt
  ```
  مثال لملف `requirements.txt`:
  ```
  langchain
  pymupdf
  python-docx
  python-pptx
  pytesseract
  Pillow
  ```
- تذكّر تثبيت Tesseract على Windows وWSL وتحديد مسار اللغة العربية.

## 8. Fine-Tuning باستخدام LoRA / QLoRA

مجلد العمل:
```
/models/base_model/
/models/fine_tuned/
/data/university_docs/
```

### مثال لسكربت `finetune.py`

ضع سكربت التدريب داخل مجلد `models/` أو `scripts/` حسب تفضيلك. فكرة عامة:

```bash
accelerate launch finetune.py \
  --base_model ./models/base_model/llama3.2-3b \
  --output_dir ./models/fine_tuned/psau-v1 \
  --data_path ./data/university_docs \
  --lora_r 8 --lora_alpha 16 --lora_dropout 0.05
```

داخل README أو السكربت، وثّق كيفية دمج الأوزان المخرجة مع Ollama (`ollama create` مع ملف Modelfile).

## 9. تحديث التهيئة والـ System Prompt

- تحرير القالب الأساسي من خلال `backend/utils/memory.js`.
- يمكن إضافة متغيرات جديدة في جدول `users` ثم تمريرها في `buildSystemPrompt`.
- لتغيير حدود الرموز أو إعدادات النموذج عدّل ملف `backend/config.js` و`backend/utils/ollamaClient.js`.

## 10. الأمن والتحسينات المقترحة

- استخدم HTTPS عندما تفتح الخدمة للشبكة.
- فعّل التحقق الثنائي للمشرفين.
- اربط التخزين المؤقت (Redis) لإدارة الجلسات إذا زاد الحمل.
- أضف فحص برمجيات خبيثة للملفات عند الحاجة.

## 11. تشغيل كرون حذف الملفات

يعمل سكربت `backend/cronDelete.js` يومياً الساعة 03:00 لحذف الملفات التي تجاوزت فترة الأسبوع. يمكن تشغيله يدوياً:

```bash
node -e "require('./backend/cronDelete').purgeExpiredFiles()"
```

## 12. إعدادات النسخ لكل جامعة

- انسخ المستودع.
- حدّث شعار الجامعة، اسم النموذج، ووثائق التدريب داخل `data/university_docs`.
- شغّل Fine-tuning جديد وخزّن الأوزان في `models/fine_tuned/<university>`.
- عدّل ملف `.env` والتهيئة بما يتناسب مع الجامعة الجديدة.

## 13. ملفات إضافية مقترحة

- `scripts/backup-db.sh` لأخذ نسخة من قاعدة البيانات.
- `scripts/sync-model.sh` لنسخ الأوزان بين الأجهزة.

## 14. اعتمادات

تم تصميم المشروع ليخدم الجامعات السعودية وخصوصاً اللهجة النجدية، مع قابلية التخصيص الكامل للمستندات والسياسات الرسمية.
