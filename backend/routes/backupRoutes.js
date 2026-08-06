const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const auth = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

// Only super_admin is allowed to backup/restore database
router.get('/export', auth, roleMiddleware('super_admin'), backupController.exportBackup);
router.post('/restore', auth, roleMiddleware('super_admin'), upload.single('backup'), backupController.restoreBackup);

module.exports = router;
