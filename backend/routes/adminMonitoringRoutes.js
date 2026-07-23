const express = require('express');
const router = express.Router();
const adminMonitoringController = require('../controllers/adminMonitoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protection: Auth required
router.use(authMiddleware);

// Routes
router.get('/students', roleMiddleware('admin'), adminMonitoringController.getStudentsMonitoring);
router.get('/students/:studentId', roleMiddleware('admin'), adminMonitoringController.getStudentDetailMonitoring);
router.get('/teachers', roleMiddleware('admin'), adminMonitoringController.getTeachersMonitoring);
router.get('/teacher-activities', roleMiddleware('admin'), adminMonitoringController.getTeacherActivities);

// Leger routes (accessible by Admin & Guru/Wali Kelas)
router.get('/leger', adminMonitoringController.getLegerByClass);
router.get('/export-leger', adminMonitoringController.exportLegerExcel);

module.exports = router;
