const pool = require('../db');

async function getOverview(_req, res) {
  try {
    const [[userCount]] = await pool.execute('SELECT COUNT(*) AS total FROM users');
    const [[fileCount]] = await pool.execute('SELECT COUNT(*) AS total FROM uploads');
    const [[chatCount]] = await pool.execute('SELECT COUNT(*) AS total FROM chats');
    res.json({
      users: userCount.total,
      uploads: fileCount.total,
      chats: chatCount.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'تعذّر جلب البيانات' });
  }
}

async function listTrainingFiles(_req, res) {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT file_path FROM uploads ORDER BY uploaded_at DESC LIMIT 100');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'لا يمكن جلب الملفات' });
  }
}

module.exports = {
  getOverview,
  listTrainingFiles
};
