const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const materialController = require('../controllers/materialController');
const { uploadMaterial } = require('../middleware/uploadMiddleware');

// Upload materi dengan file (single)
router.post('/', auth, uploadMaterial.single('file'), materialController.createMaterial);
router.post('/distribute-batch', auth, materialController.distributeMaterialsBatch);
router.post('/generate-ai', auth, materialController.generateMaterial);
router.post('/generate-quiz-ai', auth, materialController.generateQuiz);

router.get('/', auth, materialController.getAllMaterials);
router.get('/guru/me', auth, materialController.getTeacherMaterials);
router.get('/siswa/me', auth, materialController.getStudentMaterials);
router.post('/:id/progress', auth, materialController.updateMaterialProgress);
router.get('/:id', auth, materialController.getMaterialById);
router.put('/:id', auth, materialController.updateMaterial);
router.delete('/:id', auth, materialController.deleteMaterial);

module.exports = router;