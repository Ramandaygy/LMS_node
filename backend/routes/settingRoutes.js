const express = require('express');

const router = express.Router();

const settingController = require(
  '../controllers/settingController'
);

const authMiddleware = require(
  '../middleware/authMiddleware'
);

router.get(
  '/',
  authMiddleware,
  settingController.getSettings
);

router.put(
  '/',
  authMiddleware,
  settingController.updateSettings
);

module.exports = router;