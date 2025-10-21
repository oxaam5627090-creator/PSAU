const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res) {
  const { universityId, name, password, college } = req.body;
  if (!universityId || !name || !password || !college) {
    return res.status(400).json({ message: 'الرجاء تعبئة كل الحقول' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [existing] = await pool.execute('SELECT id FROM users WHERE university_id = ?', [universityId]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'الحساب موجود مسبقاً' });
    }

    await pool.execute(
      'INSERT INTO users (university_id, name, college, password, created_at) VALUES (?, ?, ?, ?, NOW())',
      [universityId, name, college, hashed]
    );

    return res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'خطأ في إنشاء الحساب' });
  }
}

async function login(req, res) {
  const { universityId, password } = req.body;
  if (!universityId || !password) {
    return res.status(400).json({ message: 'الرجاء إدخال بيانات الدخول' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE university_id = ?', [universityId]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        universityId: user.university_id,
        college: user.college,
        schedule: user.schedule,
        personalInfo: user.personal_info
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
}

module.exports = {
  register,
  login
};
