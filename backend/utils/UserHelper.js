const UserSiswa = require('../models/UserSiswa');
const UserGuru = require('../models/UserGuru');
const UserOrtu = require('../models/UserOrtu');
const UserAdmin = require('../models/UserAdmin');
const bcrypt = require('bcryptjs');

const userModels = {
  siswa: UserSiswa,
  guru: UserGuru,
  ortu: UserOrtu,
  admin: UserAdmin
};

async function findUserByEmail(email) {
  for (const [role, Model] of Object.entries(userModels)) {
    const user = await Model.findOne({ email }).select('+password');
    if (user) {
      const userObj = user.toObject();
      return { ...userObj, role };
    }
  }
  return null;
}

async function findUserByUsername(username) {
  for (const [role, Model] of Object.entries(userModels)) {
    const user = await Model.findOne({ username }).select('+password');
    if (user) {
      const userObj = user.toObject();
      return { ...userObj, role };
    }
  }
  return null;
}

async function findUserById(id, role) {
  const Model = userModels[role];
  if (!Model) return null;
  const user = await Model.findById(id);
  if (!user) return null;
  const userObj = user.toObject();
  delete userObj.password;
  return userObj;
}

async function verifyPassword(user, plainPassword) {
  if (!user || !user.password || !plainPassword) return false;
  return await bcrypt.compare(String(plainPassword), String(user.password));
}

async function countByRole(role, filter = {}) {
  const Model = userModels[role];
  if (!Model) return 0;
  return await Model.countDocuments(filter);
}

async function getStudentsByParent(parentId) {
  const parent = await UserOrtu.findById(parentId);
  if (!parent || !parent.children || parent.children.length === 0) return [];
  return await UserSiswa.find({ _id: { $in: parent.children } });
}

// Fungsi formatUser: ubah _id menjadi id, hapus password, sesuaikan field untuk frontend
function formatUser(user) {
  if (!user) return null;
  const formatted = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    profile: user.profile || {},
    created_at: user.created_at ? user.created_at.toISOString() : null,
    updated_at: user.updated_at ? user.updated_at.toISOString() : null
  };
  // Role-specific fields
  if (user.role === 'siswa') {
    formatted.nis = user.nis;
    formatted.class_id = user.class_id ? user.class_id.toString() : null;
    formatted.parent_id = user.parent_id ? user.parent_id.toString() : null;
    formatted.academic_year_id = user.academic_year_id ? user.academic_year_id.toString() : null;
    formatted.status = user.status;
  } else if (user.role === 'guru') {
    formatted.nip = user.nip;
    formatted.teacher_code = user.teacher_code;
    formatted.subjects = user.subjects ? user.subjects.map(id => id.toString()) : [];
    formatted.classes = user.classes ? user.classes.map(id => id.toString()) : [];
    formatted.phone = user.phone;
    formatted.is_active = user.is_active;
  } else if (user.role === 'ortu') {
    formatted.nik = user.nik;
    formatted.children = user.children ? user.children.map(id => id.toString()) : [];
    formatted.phone = user.phone;
    formatted.is_active = user.is_active;
  } else if (user.role === 'admin') {
    formatted.permissions = user.permissions || [];
    formatted.phone = user.phone;
    formatted.is_active = user.is_active;
  }
  return formatted;
}

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  verifyPassword,
  countByRole,
  getStudentsByParent,
  formatUser,
  userModels
};