// utils/submissionUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Folder penyimpanan file submission
const UPLOAD_FOLDER = path.join(__dirname, '..', 'uploads', 'submissions');

// Buat folder jika belum ada
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Konfigurasi penyimpanan
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_FOLDER);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Izinkan semua tipe file
  cb(null, true);
};

// Middleware upload single file dengan field name 'file'
const uploadSubmission = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('file');

// Helper untuk menyimpan metadata file
function saveSubmissionFile(file) {
  if (!file) return null;
  return {
    originalname: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype
  };
}

module.exports = {
  uploadSubmission,
  saveSubmissionFile,
  UPLOAD_FOLDER
};