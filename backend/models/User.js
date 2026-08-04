const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      default: ''
    },

    role: {
      type: String,
      enum: ['admin', 'guru', 'siswa', 'ortu', 'alumni'],
      default: 'siswa'
    },

    full_name: {
      type: String,
      default: ''
    },

    // 🔥 TAMBAHKAN FIELD GENDER
    gender: {
      type: String,
      enum: ['Laki-laki', 'Perempuan', 'L', 'P'],
      default: ''
    },

    // atau jika pakai bahasa Indonesia
    jenis_kelamin: {
      type: String,
      enum: ['Laki-laki', 'Perempuan', 'L', 'P'],
      default: ''
    },

    teacher_code: {
      type: String,
      default: ''
    },

    nip: {
      type: String,
      default: ''
    },

    nis: {
      type: String,
      default: ''
    },

    nik: {
      type: String,
      default: ''
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      }
    ],

    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class'
      }
    ],

    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    },

    graduated_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null
    },

    graduated_from_class_name: {
      type: String,
      default: ''
    },

    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    phone: {
      type: String,
      default: ''
    },

    profile: {
      type: Object,
      default: {}
    },

    is_active: {
      type: Boolean,
      default: true
    },

    is_verified: {
      type: Boolean,
      default: false
    },

    permissions: {
      type: Array,
      default: []
    },

    profileImage: {
      type: String,
      default: ''
    },

    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

userSchema.index({ role: 1, class_name: 1 });
userSchema.index({ email: 1 });
userSchema.index({ nis: 1 });
userSchema.index({ nip: 1 });

module.exports = mongoose.model('User', userSchema);