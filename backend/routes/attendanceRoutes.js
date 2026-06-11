const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const attendanceController = require('../controllers/attendanceController');

// ===== GURU =====
router.get('/schedules', auth, attendanceController.getTeacherSchedules);
router.get('/classes', auth, attendanceController.getTeacherClasses);
router.get('/students/:classId', auth, attendanceController.getClassStudents);
router.get('/', auth, attendanceController.getAttendance);
router.post('/save', auth, attendanceController.saveAttendance);

// ===== SISWA =====
router.get('/siswa/attendance', auth, attendanceController.getStudentAttendance);

// ===== ORTU =====
router.get('/ortu/children', auth, attendanceController.getOrtuChildren);
router.get('/ortu/attendance', auth, attendanceController.getOrtuAttendance);
router.get('/ortu/children/:childId/today', auth, attendanceController.getOrtuTodayAttendance);

module.exports = router;