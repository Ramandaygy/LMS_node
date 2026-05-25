const express = require('express');
const router = express.Router();
const subjectsController = require('../../controllers/admin/subjectsController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/options', subjectsController.getSubjectOptions);
router.get('/', subjectsController.getAllSubjects);
router.post('/', subjectsController.createSubject);
router.put('/:subject_id', subjectsController.updateSubject);
router.delete('/:subject_id', subjectsController.deleteSubject);

module.exports = router;