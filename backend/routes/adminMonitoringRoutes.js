const express = require('express');
const router = express.Router();
const adminMonitoringController = require('../controllers/adminMonitoringController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protection: Admin only
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Routes
router.get('/students', adminMonitoringController.getStudentsMonitoring);
router.get('/students/:studentId', adminMonitoringController.getStudentDetailMonitoring);
router.get('/teachers', adminMonitoringController.getTeachersMonitoring);
router.get('/teacher-activities', adminMonitoringController.getTeacherActivities);

module.exports = router;
