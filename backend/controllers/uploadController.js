import path from 'path';
import fs from 'fs/promises';
import { pool } from '../db.js';
import { extractTextFromFile } from '../utils/fileExtractor.js';

export async function handleUpload(req, res) {
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

    await pool.query(
      'INSERT INTO uploads (user_id, file_path, file_type) VALUES (?, ?, ?)',
      [userId, req.file.path, ext]
    );

    const extracted = await extractTextFromFile(req.file.path, ext);

    return res.json({
      path: req.file.path,
      fileType: ext,
      extractedText: extracted,
    });
  } catch (error) {
    console.error('handleUpload error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listUploads(req, res) {
  try {
    const { userId } = req.user;
    const [uploads] = await pool.query(
      'SELECT id, file_path, file_type, uploaded_at FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    return res.json(uploads);
  } catch (error) {
    console.error('listUploads error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteUpload(req, res) {
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
