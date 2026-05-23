const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_FOLDER = 'uploads/submissions';
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.txt'];

if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const uniqueName = `${name}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });
const uploadSubmission = upload.single('file'); // field name 'file'

const saveSubmissionFile = (file) => {
  if (!file) return null;
  return {
    filename: file.originalname,
    path: file.filename
  };
};

module.exports = { uploadSubmission, saveSubmissionFile, UPLOAD_FOLDER };