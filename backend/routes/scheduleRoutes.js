const express = require('express');
const router = express.Router();

const scheduleController =
  require('../controllers/scheduleController');

const authMiddleware =
  require('../middleware/authMiddleware');

router.get(
  '/',
  authMiddleware,
  scheduleController.getAllSchedules
);

router.post(
  '/bulk',
  authMiddleware,
  scheduleController.bulkSaveSchedule
);


router.get(
  '/teacher/:teacherId',
  authMiddleware,
  scheduleController.getTeacherSchedule
);

router.get(
  '/class/:classId',
  authMiddleware,
  scheduleController.getClassSchedule
);

router.get(
  '/siswa/today',
  authMiddleware,
  scheduleController.getStudentTodaySchedule
);

router.get(
  '/siswa/weekly',
  authMiddleware,
  scheduleController.getStudentWeeklySchedule
);

router.get(
  '/ortu/child/:childId',
  authMiddleware,
  scheduleController.getOrtuChildSchedule
);

router.put(
  '/:id',
  authMiddleware,
  scheduleController.updateSchedule
);

router.delete(
  '/:id',
  authMiddleware,
  scheduleController.deleteSchedule
);

router.post(
  '/auto-generate',
  authMiddleware,
  scheduleController.autoGenerateSchedule
);

module.exports = router;