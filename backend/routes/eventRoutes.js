const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// GET /api/events - Everyone can view events
router.get('/', authMiddleware, eventController.getEvents);

// Admin only routes
router.post('/', authMiddleware, roleMiddleware('admin'), eventController.createEvent);
router.put('/:id', authMiddleware, roleMiddleware('admin'), eventController.updateEvent);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), eventController.deleteEvent);

module.exports = router;
