const mongoose = require('mongoose');

const UserSiswaSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'siswa' },
  full_name: { type: String, required: true },
  nis: { type: String, unique: true, sparse: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserOrtu' },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  status: { type: String, enum: ['active', 'alumni', 'inactive'], default: 'active' },
  profile: {
    avatar: { type: String, default: null },
    bio: String,
    phone: String,
    address: String
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserSiswa', UserSiswaSchema, 'users_siswa');