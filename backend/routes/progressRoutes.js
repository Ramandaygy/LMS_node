const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const progressController = require('../controllers/progressController');

// ===== SISWA =====
router.get('/me', auth, roleMiddleware('siswa'), progressController.getStudentProgress);

// ===== GURU =====
router.get('/class/:classId', auth, roleMiddleware('guru'), progressController.getClassStudentsProgress);

// ===== ORTU =====
router.get('/ortu/children/:childId', auth, roleMiddleware('ortu'), progressController.getChildProgress);

module.exports = router;
