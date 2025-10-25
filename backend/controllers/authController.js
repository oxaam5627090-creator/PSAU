const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { config } = require('../config');

async function register(req, res) {
  try {
    const { universityId, name, password, college, schedule, language } = req.body;

    if (!universityId || !name || !password || !college) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE university_id = ?',
      [universityId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const scheduleJson = schedule ? JSON.stringify(schedule) : null;
    const preferredLanguage = normalizeLanguage(language);

    await pool.query(
      'INSERT INTO users (university_id, name, college, password, schedule, personal_info, preferred_language) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [universityId, name, college, hashed, scheduleJson, JSON.stringify({}), preferredLanguage]
    );

    return res.status(201).json({ message: 'User registered' });
  } catch (error) {
    console.error('register error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { universityId, password } = req.body;
    if (!universityId || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE university_id = ?',
      [universityId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        universityId: user.university_id,
        name: user.name,
        college: user.college,
        schedule: user.schedule,
        personalInfo: user.personal_info,
        preferredLanguage: user.preferred_language || 'ar',
      },
    });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { register, login };

function normalizeLanguage(language) {
  if (!language || typeof language !== 'string') {
    return 'ar';
  }

  const value = language.toLowerCase();
  return value === 'en' ? 'en' : 'ar';
}
