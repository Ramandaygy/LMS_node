const express = require('express');
const router = express.Router();
const studentsController = require('../../controllers/guru/studentsController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

// Semua route guru harus login dan role 'guru'
router.use(auth, allowRoles('guru'));

router.get('/', studentsController.getMyStudents);

module.exports = router;