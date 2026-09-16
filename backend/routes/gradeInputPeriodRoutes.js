const express = require('express');
const router = express.Router();
const controller = require('../controllers/gradeInputPeriodController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// check-status dipanggil oleh guru, jadi authMiddleware cukup
router.get('/check-status', authMiddleware, controller.checkStatus);

// endpoint lain hanya untuk admin/super_admin/wakakur
router.use(authMiddleware, roleMiddleware(['admin', 'super_admin', 'wakil_kurikulum']));

router.get('/', controller.getPeriods);
router.post('/', controller.createPeriod);
router.get('/:id', controller.getPeriodById);
router.put('/:id', controller.updatePeriod);
router.delete('/:id', controller.deletePeriod);

router.post('/:id/access', controller.grantAccess);
router.delete('/access/:accessId', controller.revokeAccess);

module.exports = router;
