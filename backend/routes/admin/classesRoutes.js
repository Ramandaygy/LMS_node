const express = require('express');
const router = express.Router();
const adminClassesController = require('../../controllers/admin/classesController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/options', adminClassesController.getClassOptions);
router.get('/teachers/options', adminClassesController.getTeacherOptions);
router.get('/academic-years/options', adminClassesController.getAcademicYearOptions);
router.get('/', adminClassesController.getAllClasses);
router.post('/', adminClassesController.createClass);
router.put('/:class_id', adminClassesController.updateClass);
router.delete('/:class_id', adminClassesController.deleteClass);

module.exports = router;