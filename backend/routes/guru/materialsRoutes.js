const express = require('express');
const router = express.Router();
const materialsController = require('../../controllers/guru/materialsController');
const { uploadMaterials } = require('../../utils/materialUpload');
const auth = require('../../middleware/authMiddleware');
const { allowRoles } = require('../../middleware/roleMiddleware');

router.use(auth, allowRoles('guru'));

router.get('/', materialsController.getMaterials);
router.post('/', uploadMaterials, materialsController.createMaterial);
router.delete('/:material_id', materialsController.deleteMaterial);
router.get('/uploads/materials/:filename', materialsController.serveMaterialFile);

module.exports = router;