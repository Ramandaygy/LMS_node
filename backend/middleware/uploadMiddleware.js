const multer = require('multer');
const path = require('path');

const isVercel = process.env.VERCEL === '1';

// =====================================
// VERCEL MODE
// =====================================
if (isVercel) {

  const memoryStorage = multer.memoryStorage();

  const uploadSubmission = multer({
    storage: memoryStorage,
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  const uploadMaterial = multer({
    storage: memoryStorage,
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

  module.exports = {
    uploadSubmission,
    uploadMaterial,
    upload: uploadSubmission
  };

} else {

  const fs = require('fs');

  const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true
      });
    }
  };

  const submissionsDir =
    path.join(__dirname, '../uploads/submissions');

  const materialsDir =
    path.join(__dirname, '../uploads/materials');

  ensureDir(submissionsDir);
  ensureDir(materialsDir);

  const submissionStorage =
    multer.diskStorage({
      destination: (req, file, cb) =>
        cb(null, submissionsDir),

      filename: (req, file, cb) => {
        const unique =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9);

        cb(
          null,
          `submission-${unique}${path.extname(file.originalname)}`
        );
      }
    });

  const materialStorage =
    multer.diskStorage({
      destination: (req, file, cb) =>
        cb(null, materialsDir),

      filename: (req, file, cb) => {
        const unique =
          Date.now() +
          '-' +
          Math.round(Math.random() * 1e9);

        cb(
          null,
          `material-${unique}${path.extname(file.originalname)}`
        );
      }
    });

  const uploadSubmission =
    multer({
      storage: submissionStorage,
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    });

  const uploadMaterial =
    multer({
      storage: materialStorage,
      limits: {
        fileSize: 10 * 1024 * 1024
      }
    });

  module.exports = {
    uploadSubmission,
    uploadMaterial,
    upload: uploadSubmission
  };
}