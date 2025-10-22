const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const { getOverview } = require('../controllers/adminController');

const router = Router();

router.get('/overview', authenticate, getOverview);

module.exports = router;
