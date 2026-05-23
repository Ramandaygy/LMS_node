const mongoose = require('mongoose');

const UserOrtuSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'ortu' },
  full_name: { type: String, required: true },
  nik: { type: String, unique: true, sparse: true },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UserSiswa' }],
  phone: String,
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  profile: {
    avatar: String,
    bio: String,
    address: String
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserOrtu', UserOrtuSchema, 'users_ortu');