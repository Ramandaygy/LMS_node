const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_FOLDER = 'uploads/materials';
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip', '.rar', '.txt', '.ppt', '.pptx', '.xls', '.xlsx', '.mp4', '.mp3'];

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

// Middleware untuk multiple files dengan field name 'attachments'
const uploadMaterials = upload.array('attachments');

// Helper untuk menyimpan info file ke database
const saveUploadedFiles = (files) => {
  if (!files) return [];
  return files.map(file => ({
    filename: file.originalname,
    path: file.filename
  }));
};

module.exports = { uploadMaterials, saveUploadedFiles, UPLOAD_FOLDER };