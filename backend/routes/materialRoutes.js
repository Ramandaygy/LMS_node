const express = require('express');

const router = express.Router();

const materialController = require(
  '../controllers/materialController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  materialController.getAllMaterials
);

router.post(
  '/',
  authMiddleware,
  materialController.createMaterial
);

router.post(
  '/generate',
  authMiddleware,
  materialController.generateMaterial
);

module.exports = router;