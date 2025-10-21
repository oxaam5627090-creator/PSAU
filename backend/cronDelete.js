import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { pool } from './db.js';
import { config } from './config.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function deleteOldFiles() {
  const cutoff = new Date(Date.now() - ONE_WEEK_MS);
  const [oldUploads] = await pool.query(
    'SELECT id, file_path FROM uploads WHERE uploaded_at < ?',
    [cutoff]
  );

  for (const upload of oldUploads) {
    try {
      await fs.unlink(upload.file_path);
    } catch (error) {
      console.warn(`Failed to delete file ${upload.file_path}:`, error.message);
    }
    await pool.query('DELETE FROM uploads WHERE id = ?', [upload.id]);
  }
}

cron.schedule('0 * * * *', () => {
  deleteOldFiles().catch((error) => console.error('deleteOldFiles error', error));
});

export function ensureUploadsDir() {
  const dir = path.resolve(config.uploadsDir);
  return fs.mkdir(dir, { recursive: true });
}
