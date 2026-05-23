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

// Cari user berdasarkan email di semua koleksi
async function findUserByEmail(email) {
  for (const [role, Model] of Object.entries(userModels)) {
    const user = await Model.findOne({ email }).lean();
    if (user) return { ...user, role };
  }
  return null;
}

// Cari user berdasarkan username
async function findUserByUsername(username) {
  for (const [role, Model] of Object.entries(userModels)) {
    const user = await Model.findOne({ username }).lean();
    if (user) return { ...user, role };
  }
  return null;
}

// Cari user berdasarkan ID dan role
async function findUserById(id, role) {
  const Model = userModels[role];
  if (!Model) return null;
  return await Model.findById(id).lean();
}

// Verifikasi password
async function verifyPassword(user, plainPassword) {
  return await bcrypt.compare(plainPassword, user.password);
}

// Hitung jumlah user berdasarkan role dan filter
async function countByRole(role, filter = {}) {
  const Model = userModels[role];
  if (!Model) return 0;
  return await Model.countDocuments(filter);
}

// Ambil semua siswa yang terhubung dengan orang tua (berdasarkan children array)
async function getStudentsByParent(parentId) {
  const parent = await UserOrtu.findById(parentId).lean();
  if (!parent || !parent.children || parent.children.length === 0) return [];
  const students = await UserSiswa.find({ _id: { $in: parent.children } }).lean();
  return students;
}

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  verifyPassword,
  countByRole,
  getStudentsByParent,
  userModels
};