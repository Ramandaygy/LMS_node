const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController');

// Semua route di bawah memerlukan autentikasi dan diasumsikan hanya guru yang mengakses
router.get('/classes', auth, attendanceController.getTeacherClasses);
router.get('/students/:classId', auth, attendanceController.getClassStudents);
router.get('/', auth, attendanceController.getAttendance);
router.post('/save', auth, attendanceController.saveAttendance);

module.exports = router;