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
    const user = await Model.findOne({ email }).lean();
    if (user) return { ...user, role };
  }
  return null;
}

async function findUserByUsername(username) {
  for (const [role, Model] of Object.entries(userModels)) {
    const user = await Model.findOne({ username }).lean();
    if (user) return { ...user, role };
  }
  return null;
}

async function findUserById(id, role) {
  const Model = userModels[role];
  if (!Model) return null;
  return await Model.findById(id).lean();
}

async function verifyPassword(user, plainPassword) {
  return await bcrypt.compare(plainPassword, user.password);
}

module.exports = {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  verifyPassword,
  userModels
};