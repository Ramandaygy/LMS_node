const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const exportImportController = require('../../controllers/admin/exportImportController');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('admin'));

// Export/Import Kelas
router.get('/export/classes', exportImportController.exportClasses);
router.post('/import/classes', upload.single('file'), exportImportController.importClasses);

// Export/Import Siswa
router.get('/export/students', exportImportController.exportStudents);
router.post('/import/students', upload.single('file'), exportImportController.importStudents);

// Export/Import Guru
router.get('/export/teachers', exportImportController.exportTeachers);
router.post('/import/teachers', upload.single('file'), exportImportController.importTeachers);

// Export/Import Tahun Ajaran
router.get('/export/academic-years', exportImportController.exportAcademicYears);
router.post('/import/academic-years', upload.single('file'), exportImportController.importAcademicYears);

// Export/Import Orang Tua
router.get('/export/parents', exportImportController.exportParents);
router.post('/import/parents', upload.single('file'), exportImportController.importParents);

// Export/Import Mata Pelajaran
router.get('/export/subjects', exportImportController.exportSubjects);
router.post('/import/subjects', upload.single('file'), exportImportController.importSubjects);

// Download Template
router.get('/template/students', exportImportController.exportStudentsTemplate);
router.get('/template/teachers', exportImportController.exportTeachersTemplate);

module.exports = router;