const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const {
  getProfile,
  updateProfile,
  updateSchedule,
  updateLanguage,
} = require('../controllers/userController');

const router = Router();

router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/schedule', authenticate, updateSchedule);
router.put('/language', authenticate, updateLanguage);

module.exports = router;
