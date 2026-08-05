const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const dailyAttendanceController = require('../controllers/dailyAttendanceController');

// All endpoints require auth
router.use(authMiddleware);

// Record/update attendance (Super Admin, Wakil Kurikulum, BK)
router.post('/upsert', roleMiddleware('admin', 'super_admin', 'wakil_kurikulum', 'bk'), dailyAttendanceController.upsertDailyAttendance);

// View attendance per class (Super Admin, Wakil Kurikulum, BK, Guru)
router.get('/class/:classId', roleMiddleware('admin', 'super_admin', 'wakil_kurikulum', 'bk', 'guru'), dailyAttendanceController.getDailyAttendanceByClass);

// Summary stats for student report cards
router.get('/student/:studentId/summary', dailyAttendanceController.getStudentAttendanceSummary);

module.exports = router;
