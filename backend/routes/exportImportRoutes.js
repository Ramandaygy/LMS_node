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
router.get('/export/schedules', controller.exportSchedules);
router.get('/export/activities', controller.exportActivities);

// 5 PILAR REPORT APIS
router.get('/reports/academic-master', controller.getAcademicMasterReport);
router.get('/reports/attendance-recap', controller.getAttendanceRecapReport);
router.get('/reports/user-management', controller.getUserManagementReport);
router.get('/reports/evaluations', controller.getEvaluationsReport);
router.get('/reports/audit-trail', controller.getAuditTrailReport);

// 5 PILAR EXCEL EXPORT ROUTES
router.get('/export/academic-master', controller.exportAcademicMaster);
router.get('/export/attendance-recap', controller.exportAttendanceRecap);
router.get('/export/user-management', controller.exportUserManagement);
router.get('/export/evaluations', controller.exportEvaluations);
router.get('/export/audit-trail', controller.exportAuditTrail);

// TEMPLATES
router.get('/export/students-template', controller.exportStudentsTemplate);
router.get('/export/teachers-template', controller.exportTeachersTemplate);
router.get('/export/parents-template', controller.exportParentsTemplate);
router.get('/export/schedules-template', controller.exportSchedulesTemplate);

// IMPORT ROUTES
router.post('/import/classes', upload.single('file'), controller.importClasses);
router.post('/import/students', upload.single('file'), controller.importStudents);
router.post('/import/teachers', upload.single('file'), controller.importTeachers);
router.post('/import/academic-years', upload.single('file'), controller.importAcademicYears);
router.post('/import/parents', upload.single('file'), controller.importParents);
router.post('/import/subjects', upload.single('file'), controller.importSubjects);
router.post('/import/schedules', upload.single('file'), controller.importSchedules);

module.exports = router;
