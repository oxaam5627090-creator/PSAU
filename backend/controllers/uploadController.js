const path = require('path');
const fs = require('fs/promises');
const { pool } = require('../db');
const { extractTextFromFile, ExtractionError } = require('../utils/fileExtractor');

async function handleUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { userId } = req.user;

    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const allowed = ['pdf', 'docx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
    if (!allowed.includes(ext)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    const [result] = await pool.query(
      'INSERT INTO uploads (user_id, file_path, file_type, original_name) VALUES (?, ?, ?, ?)',
      [userId, req.file.path, ext, req.file.originalname]
    );

    const extracted = await extractTextFromFile(req.file.path, ext);

    return res.json({
      id: result.insertId,
      path: req.file.path,
      fileType: ext,
      fileName: req.file.originalname,
      extractedText: extracted,
    });
  } catch (error) {
    console.error('handleUpload error', error);
    if (error instanceof ExtractionError) {
      return res.status(422).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listUploads(req, res) {
  try {
    const { userId } = req.user;
    const [uploads] = await pool.query(
      'SELECT id, file_path, file_type, original_name, uploaded_at FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    return res.json(uploads);
  } catch (error) {
    console.error('listUploads error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteUpload(req, res) {
  try {
    const { userId } = req.user;
    const { uploadId } = req.params;

    const [[upload]] = await pool.query(
      'SELECT * FROM uploads WHERE id = ? AND user_id = ?',
      [uploadId, userId]
    );

    if (!upload) {
      return res.status(404).json({ message: 'File not found' });
    }

    await pool.query('DELETE FROM uploads WHERE id = ?', [uploadId]);

    await fs.unlink(upload.file_path).catch(() => {});

    return res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('deleteUpload error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { handleUpload, listUploads, deleteUpload };
