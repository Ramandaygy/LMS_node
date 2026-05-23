const mongoose = require('mongoose');

const UserGuruSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'guru' },
  full_name: { type: String, required: true },
  nip: { type: String, unique: true, sparse: true },
  teacher_code: String,
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  phone: String,
  is_active: { type: Boolean, default: true },
  profile: {
    avatar: { type: String, default: null },
    bio: String,
    address: String
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserGuru', UserGuruSchema, 'users_guru');