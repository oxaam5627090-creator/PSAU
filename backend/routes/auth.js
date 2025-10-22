const { Router } = require('express');
const { login, register } = require('../controllers/authController');

const router = Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;
