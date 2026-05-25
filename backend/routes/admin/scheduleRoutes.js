const express = require('express');
const router = express.Router();
const schedulesController = require('../../controllers/admin/schedulesController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/', schedulesController.getSchedule);
router.post('/bulk', schedulesController.bulkSaveSchedule);
router.post('/auto-generate', schedulesController.autoGenerateSchedule);

module.exports = router;