const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Konfigurasi multer untuk upload avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Semua route memerlukan authentication
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/change-password', auth, profileController.changePassword);
router.post('/avatar', auth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/logout', auth, profileController.logout);

module.exports = router;