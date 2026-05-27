const express = require('express');

const router = express.Router();

const moduleController = require(
  '../controllers/moduleController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  moduleController.getAllModules
);

router.get(
  '/:id',
  authMiddleware,
  moduleController.getModuleById
);

router.post(
  '/',
  authMiddleware,
  moduleController.createModule
);

router.put(
  '/:id',
  authMiddleware,
  moduleController.updateModule
);

router.delete(
  '/:id',
  authMiddleware,
  moduleController.deleteModule
);

module.exports = router;