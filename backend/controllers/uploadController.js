const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { STORAGE_PATH } = require('../config');
const readPdf = require('../utils/pdfReader');
const readDocx = require('../utils/docxReader');
const readPpt = require('../utils/pptReader');
const runOcr = require('../utils/ocr');

const SUPPORTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg'];

function ensureUserFolder(userId) {
  const dir = path.join(STORAGE_PATH, String(userId));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function saveUploadRecord(userId, filePath, mime) {
  await pool.execute('INSERT INTO uploads (user_id, file_path, file_type, uploaded_at) VALUES (?, ?, ?, NOW())', [userId, filePath, mime]);
}

async function parseFile(filePath, mime) {
  if (mime === 'application/pdf') {
    return readPdf(filePath);
  }
  if (mime.includes('word')) {
    return readDocx(filePath);
  }
  if (mime.includes('presentation') || mime.includes('powerpoint')) {
    return readPpt(filePath);
  }
  if (mime.startsWith('image/')) {
    return runOcr(filePath, 'ara');
  }
  return '';
}

async function handleUpload(req, res) {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ message: 'لم يتم تحميل ملف' });
  }

  const file = req.files.file;
  if (!SUPPORTED_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ message: 'نوع الملف غير مدعوم حالياً' });
  }

  try {
    const userDir = ensureUserFolder(req.userId);
    const destPath = path.join(userDir, `${Date.now()}-${file.name}`);
    await file.mv(destPath);
    await saveUploadRecord(req.userId, destPath, file.mimetype);
    const content = await parseFile(destPath, file.mimetype);
    res.json({ message: 'تم حفظ الملف بنجاح', contentSnippet: content.slice(0, 500) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'تعذّر حفظ الملف' });
  }
}

async function listUploads(req, res) {
  try {
    const [rows] = await pool.execute('SELECT id, file_path, file_type, uploaded_at FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC', [req.userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'تعذّر جلب الملفات' });
  }
}

module.exports = {
  handleUpload,
  listUploads
};
