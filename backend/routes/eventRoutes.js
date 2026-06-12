const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// GET /api/events - Everyone can view events
router.get('/', auth, eventController.getEvents);

// Admin only routes
router.post('/', auth, roleCheck(['admin']), eventController.createEvent);
router.put('/:id', auth, roleCheck(['admin']), eventController.updateEvent);
router.delete('/:id', auth, roleCheck(['admin']), eventController.deleteEvent);

module.exports = router;
