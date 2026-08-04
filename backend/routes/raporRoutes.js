const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const raporController = require('../controllers/raporController');

router.get('/student/:studentId', auth, raporController.getRaporByStudent);
router.post('/student/:studentId', auth, raporController.saveRapor);

module.exports = router;
