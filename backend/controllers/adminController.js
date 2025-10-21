import { pool } from '../db.js';

export async function getOverview(req, res) {
  try {
    const [[userCount]] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [[chatCount]] = await pool.query('SELECT COUNT(*) as count FROM chats');
    const [[uploadCount]] = await pool.query('SELECT COUNT(*) as count FROM uploads');

    const [latestUploads] = await pool.query(
      'SELECT id, user_id, file_path, file_type, uploaded_at FROM uploads ORDER BY uploaded_at DESC LIMIT 10'
    );

    const [fineTuneSources] = await pool.query(
      'SELECT file_path, uploaded_at FROM uploads WHERE file_type IN ("pdf", "docx", "ppt", "pptx") ORDER BY uploaded_at DESC LIMIT 20'
    );

    return res.json({
      stats: {
        users: userCount.count,
        chats: chatCount.count,
        uploads: uploadCount.count,
      },
      latestUploads,
      fineTuneSources,
    });
  } catch (error) {
    console.error('getOverview error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
