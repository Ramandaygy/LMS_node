const express = require('express');
const router = express.Router();
const scheduleController = require('../../controllers/admin/scheduleController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/', scheduleController.getSchedule);
router.post('/bulk', scheduleController.bulkSaveSchedule);
router.post('/auto-generate', scheduleController.autoGenerateSchedule);

module.exports = router;