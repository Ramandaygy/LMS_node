const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Folder penyimpanan file (relatif terhadap root proyek backend)
const UPLOAD_FOLDER = path.join(__dirname, '..', 'uploads', 'assignments');

// Buat folder jika belum ada
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Konfigurasi storage multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_FOLDER);
  },
  filename: function (req, file, cb) {
    // Buat nama unik: timestamp + nama asli
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filter tipe file (opsional)
const fileFilter = (req, file, cb) => {
  // Izinkan semua tipe file, bisa disesuaikan
  cb(null, true);
};

// Middleware upload untuk array file dengan nama field 'attachments'
const uploadAttachments = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // maks 10MB
}).array('attachments', 10); // max 10 file

// Helper untuk menyimpan data file ke array (hanya metadata)
function saveUploadedFiles(files) {
  if (!files || files.length === 0) return [];
  return files.map(file => ({
    originalname: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype
  }));
}

module.exports = {
  uploadAttachments,
  saveUploadedFiles,
  UPLOAD_FOLDER
};