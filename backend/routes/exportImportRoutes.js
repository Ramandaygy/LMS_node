const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/exportImportController');
const authMiddleware = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// EXPORT ROUTES
router.get('/export/classes', controller.exportClasses);
router.get('/export/students', controller.exportStudents);
router.get('/export/teachers', controller.exportTeachers);
router.get('/export/academic-years', controller.exportAcademicYears);
router.get('/export/parents', controller.exportParents);
router.get('/export/subjects', controller.exportSubjects);

// TEMPLATES
router.get('/export/students-template', controller.exportStudentsTemplate);
router.get('/export/teachers-template', controller.exportTeachersTemplate);
router.get('/export/parents-template', controller.exportParentsTemplate);

// IMPORT ROUTES
router.post('/import/classes', upload.single('file'), controller.importClasses);
router.post('/import/students', upload.single('file'), controller.importStudents);
router.post('/import/teachers', upload.single('file'), controller.importTeachers);
router.post('/import/academic-years', upload.single('file'), controller.importAcademicYears);
router.post('/import/parents', upload.single('file'), controller.importParents);
router.post('/import/subjects', upload.single('file'), controller.importSubjects);

module.exports = router;
