const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/admin/settingsController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;