const express = require('express');
const router = express.Router();
const adminMonitoringController = require('../controllers/adminMonitoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protection: Auth required
router.use(authMiddleware);

// Routes (accessible by Admin & Guru)
router.get('/students', adminMonitoringController.getStudentsMonitoring);
router.get('/students/:studentId', adminMonitoringController.getStudentDetailMonitoring);
router.get('/teachers', adminMonitoringController.getTeachersMonitoring);
router.get('/teacher-activities', adminMonitoringController.getTeacherActivities);

// Leger routes (accessible by Admin & Guru/Wali Kelas)
router.get('/leger', adminMonitoringController.getLegerByClass);
router.get('/export-leger', adminMonitoringController.exportLegerExcel);

module.exports = router;
