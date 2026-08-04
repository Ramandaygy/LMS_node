const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicYearController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// SEMUA ROUTE PAKAI authMiddleware (KONSISTEN)
// ============================================================

// GET - Ambil semua tahun ajaran
router.get(
  '/',
  authMiddleware,
  controller.getAll
);

// POST - Buat tahun ajaran baru
router.post(
  '/',
  authMiddleware,
  controller.create
);

// PUT - Update tahun ajaran
router.put(
  '/:id',
  authMiddleware,
  controller.update
);

// DELETE - Hapus tahun ajaran
router.delete(
  '/:id',
  authMiddleware,
  controller.delete
);

// GET - Ambil tahun ajaran aktif
router.get(
  '/current',
  authMiddleware,
  controller.getCurrent
);

// GET - Ambil daftar alumni berdasarkan tahun ajaran
router.get(
  '/:id/alumni',
  authMiddleware,
  controller.getAlumniByYear
);

// GET - Ambil detail alumni (data diri + riwayat nilai)
router.get(
  '/:yearId/alumni/:studentId',
  authMiddleware,
  controller.getAlumniDetail
);

// POST - Proses kenaikan kelas
router.post(
  '/:id/promote',
  authMiddleware,
  controller.promoteStudents
);

// POST - Proses kenaikan semester
router.post(
  '/:id/promote-semester',
  authMiddleware,
  controller.promoteSemester
);

// POST - Proses kenaikan kelas dengan wizard (pilih kelas asal & tujuan)
router.post(
  '/:id/promote-wizard',
  authMiddleware,
  controller.promoteWizard
);

module.exports = router;