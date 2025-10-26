const { pool } = require('../db');

async function getProfile(req, res) {
  try {
    const { userId } = req.user;
    const [[user]] = await pool.query(
      'SELECT id, university_id, name, college, schedule, personal_info, preferred_language FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(formatUser(user));
  } catch (error) {
    console.error('getProfile error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateProfile(req, res) {
  try {
    const { userId } = req.user;
    const { name, college, personalInfo } = req.body;

    const [[user]] = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = [];
    const params = [];

    if (typeof name === 'string' && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (typeof college === 'string' && college.trim()) {
      updates.push('college = ?');
      params.push(college.trim());
    }

    if (personalInfo && typeof personalInfo === 'object') {
      updates.push('personal_info = ?');
      params.push(JSON.stringify(personalInfo));
    }

    if (updates.length === 0) {
      const [[fresh]] = await pool.query(
        'SELECT id, university_id, name, college, schedule, personal_info, preferred_language FROM users WHERE id = ?',
        [userId]
      );
      return res.json(formatUser(fresh));
    }

    params.push(userId);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const [[updated]] = await pool.query(
      'SELECT id, university_id, name, college, schedule, personal_info, preferred_language FROM users WHERE id = ?',
      [userId]
    );

    return res.json(formatUser(updated));
  } catch (error) {
    console.error('updateProfile error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateSchedule(req, res) {
  try {
    const { userId } = req.user;
    const { schedule } = req.body;

    if (!Array.isArray(schedule) && typeof schedule !== 'object') {
      return res.status(400).json({ message: 'Schedule must be an object or array' });
    }

    await pool.query('UPDATE users SET schedule = ? WHERE id = ?', [JSON.stringify(schedule), userId]);

    const [[updated]] = await pool.query(
      'SELECT id, university_id, name, college, schedule, personal_info, preferred_language FROM users WHERE id = ?',
      [userId]
    );

    return res.json(formatUser(updated));
  } catch (error) {
    console.error('updateSchedule error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateLanguage(req, res) {
  try {
    const { userId } = req.user;
    const { language } = req.body;

    if (typeof language !== 'string') {
      return res.status(400).json({ message: 'Language is required' });
    }

    const normalized = language.toLowerCase() === 'en' ? 'en' : 'ar';

    await pool.query('UPDATE users SET preferred_language = ? WHERE id = ?', [normalized, userId]);

    const [[updated]] = await pool.query(
      'SELECT id, university_id, name, college, schedule, personal_info, preferred_language FROM users WHERE id = ?',
      [userId]
    );

    return res.json(formatUser(updated));
  } catch (error) {
    console.error('updateLanguage error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updateSchedule,
  updateLanguage,
};

function formatUser(row) {
  return {
    id: row.id,
    universityId: row.university_id,
    name: row.name,
    college: row.college,
    schedule: parseJson(row.schedule),
    personalInfo: parseJson(row.personal_info) || {},
    preferredLanguage: row.preferred_language || 'ar',
  };
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}
