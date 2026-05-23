const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, dashboardController.getStats);
router.get('/activity', auth, dashboardController.getActivity);

module.exports = router;