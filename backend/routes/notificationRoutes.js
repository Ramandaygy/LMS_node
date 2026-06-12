const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/subscribe', authMiddleware, notificationController.subscribe);
router.post('/test', authMiddleware, notificationController.sendTestNotification);

module.exports = router;
