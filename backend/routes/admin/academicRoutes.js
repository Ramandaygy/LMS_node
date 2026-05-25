const express = require('express');
const router = express.Router();
const academicController = require('../../controllers/admin/academicController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

router.get('/', academicController.getAllAcademicYears);
router.get('/options', academicController.academicYearOptions);
router.post('/', academicController.createAcademicYear);
router.put('/:year_id', academicController.updateAcademicYear);
router.delete('/:year_id', academicController.deleteAcademicYear);
router.get('/current', academicController.getCurrentAcademicYear);
router.get('/:year_id/students-by-class', academicController.getStudentsByClassForPromotion);
router.post('/:year_id/promote', academicController.promoteStudents);
router.get('/:year_id/alumni', academicController.getAlumniByYear);
router.post('/users/students/:student_id/graduate', academicController.graduateStudent);

module.exports = router;