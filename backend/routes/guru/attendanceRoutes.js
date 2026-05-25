const express = require('express');
const router = express.Router();
const attendanceController = require('../../controllers/guru/attendanceController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('guru'));

router.get('/', attendanceController.getAttendance);
router.post('/save', attendanceController.saveAttendance);
router.get('/history', attendanceController.getAttendanceHistory);
router.get('/student/:student_id', attendanceController.getStudentAttendance);

module.exports = router;