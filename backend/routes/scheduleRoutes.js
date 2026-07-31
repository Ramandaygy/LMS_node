const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// SEMUA ROUTE PAKAI authMiddleware 
// ============================================================

// GET - Ambil semua jadwal (bisa filter by academic_year_id)
router.get(
  '/',
  authMiddleware,
  scheduleController.getAllSchedules
);

// POST - Buat 1 jadwal
router.post(
  '/',
  authMiddleware,
  scheduleController.createSchedule
);

// POST - Bulk save / import jadwal (support replace flag)
router.post(
  '/bulk',
  authMiddleware,
  scheduleController.bulkSaveSchedule
);

// POST - Auto generate dengan AI
router.post(
  '/auto-generate',
  authMiddleware,
  scheduleController.autoGenerateSchedule
);

// GET - Jadwal guru berdasarkan teacherId
router.get(
  '/teacher/:teacherId',
  authMiddleware,
  scheduleController.getTeacherSchedule
);

// GET - Jadwal kelas berdasarkan classId
router.get(
  '/class/:classId',
  authMiddleware,
  scheduleController.getClassSchedule
);

// GET - Jadwal siswa hari ini
router.get(
  '/siswa/today',
  authMiddleware,
  scheduleController.getStudentTodaySchedule
);

// GET - Jadwal siswa mingguan
router.get(
  '/siswa/weekly',
  authMiddleware,
  scheduleController.getStudentWeeklySchedule
);

// GET - Jadwal anak untuk orang tua
router.get(
  '/ortu/child/:childId',
  authMiddleware,
  scheduleController.getOrtuChildSchedule
);

// PUT - Update 1 jadwal
router.put(
  '/:id',
  authMiddleware,
  scheduleController.updateSchedule
);


// DELETE - Hapus semua jadwal berdasarkan academic_year_id (untuk replace)
router.delete(
  '/',
  authMiddleware,
  scheduleController.deleteSchedulesByYear   
);

// DELETE - Hapus 1 jadwal by ID
router.delete(
  '/:id',
  authMiddleware,
  scheduleController.deleteSchedule          
);

module.exports = router;