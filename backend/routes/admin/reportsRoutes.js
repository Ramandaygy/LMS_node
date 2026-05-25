const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/admin/reportsController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/statistics', reportsController.getStatistics);
router.get('/students', reportsController.getStudentReport);
router.get('/courses', reportsController.getCourseReport);

module.exports = router;