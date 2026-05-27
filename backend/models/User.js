const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      enum: ['admin', 'guru', 'siswa', 'ortu'],
      default: 'siswa',
    },

    full_name: {
      type: String,
      default: '',
    },

    phone: {
      type: String,
      default: '',
    },

    profile: {
      type: Object,
      default: {},
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    is_verified: {
      type: Boolean,
      default: false,
    },

    permissions: {
      type: Array,
      default: [],
    },

    profileImage: {
      type: String,
      default: '',
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports = mongoose.model('User', userSchema);