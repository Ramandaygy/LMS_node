const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// ==============================
// MULTER CONFIG
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// ==============================
// PROFILE ROUTES
// ==============================
router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/change-password', auth, profileController.changePassword);
router.post('/avatar', auth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/logout', auth, profileController.logout);

module.exports = router;