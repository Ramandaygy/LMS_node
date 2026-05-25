const express = require('express');
const router = express.Router();
const adminUsersController = require('../../controllers/admin/usersController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

// Semua route di bawah ini hanya untuk admin
router.use(auth, allowRoles('admin'));

// Students
router.get('/students', adminUsersController.getStudents);
router.post('/students', adminUsersController.createStudent);
router.put('/students/:student_id', adminUsersController.updateStudent);
router.delete('/students/:student_id', adminUsersController.deleteStudent);
router.post('/students/:student_id/reset-password', adminUsersController.resetStudentPassword);

// Teachers
router.get('/teachers', adminUsersController.getTeachers);
router.post('/teachers', adminUsersController.createTeacher);
router.put('/teachers/:teacher_id', adminUsersController.updateTeacher);
router.delete('/teachers/:teacher_id', adminUsersController.deleteTeacher);
router.post('/teachers/:teacher_id/reset-password', adminUsersController.resetTeacherPassword);

// Admins
router.get('/admins', adminUsersController.getAdmins);
// (tambahkan create/update/delete admin jika diperlukan, sesuai kebutuhan)

// Parents
router.get('/parents', adminUsersController.getParents);

module.exports = router;