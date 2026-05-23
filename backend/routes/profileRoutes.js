const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ dest: 'uploads/avatars/' }); // sesuaikan

router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/change-password', auth, profileController.changePassword);
router.post('/avatar', auth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/logout', auth, profileController.logout);

module.exports = router;