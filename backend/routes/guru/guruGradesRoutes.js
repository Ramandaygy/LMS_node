const express = require('express');
const router = express.Router();
const gradesController = require('../../controllers/guru/gradesController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('guru'));

router.get('/', gradesController.getGrades);
router.post('/', gradesController.saveGrade);

module.exports = router;