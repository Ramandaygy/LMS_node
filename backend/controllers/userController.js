const userService = require('../services/userService');
const { logActivity } = require('../utils/activityLogger');
const mongoose = require('mongoose');

// ======================================
// GET ALL USERS
// ======================================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

// ======================================
// GET USER BY ID
// ======================================
exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
};

// ======================================
// GET STUDENT DETAIL WITH PARENT & CLASS
// ======================================
exports.getStudentDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID tidak valid'
      });
    }

    const student = await userService.getStudentByIdWithParent(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Siswa tidak ditemukan'
      });
    }

    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data siswa'
    });
  }
};

// ======================================
// GET STUDENTS
// ======================================
exports.getStudents = async (req, res) => {
  try {
    const students = await userService.getUsersByRole('siswa');
    return res.status(200).json({
      success: true,
      data: students,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
    });
  }
};

// ======================================
// GET TEACHERS
// ======================================
exports.getTeachers = async (req, res) => {
  try {
    const teachers = await userService.getUsersByRole('guru');
    return res.status(200).json({
      success: true,
      data: teachers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
    });
  }
};

// ======================================
// CREATE USER
// ======================================
exports.createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    
    const roleCapitalized = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
    const cleanRole = roleCapitalized === 'Siswa' ? 'Siswa' : roleCapitalized === 'Guru' ? 'Guru' : roleCapitalized === 'Ortu' ? 'Orang Tua/Wali' : roleCapitalized;
    await logActivity(req, `Registrasi ${cleanRole}`, `Menambahkan ${user.role} ${user.full_name} (${user.nis || user.nip || user.username || '-'})`);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// UPDATE USER
// ======================================
exports.updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    
    const roleCapitalized = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
    const cleanRole = roleCapitalized === 'Siswa' ? 'Siswa' : roleCapitalized === 'Guru' ? 'Guru' : roleCapitalized === 'Ortu' ? 'Orang Tua/Wali' : roleCapitalized;
    await logActivity(req, `Update ${cleanRole}`, `Mengubah data ${user.role} ${user.full_name}`);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// DELETE USER
// ======================================
exports.deleteUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    await userService.deleteUser(req.params.id);
    
    if (user) {
      const roleCapitalized = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
      const cleanRole = roleCapitalized === 'Siswa' ? 'Siswa' : roleCapitalized === 'Guru' ? 'Guru' : roleCapitalized === 'Ortu' ? 'Orang Tua/Wali' : roleCapitalized;
      await logActivity(req, `Hapus ${cleanRole}`, `Menghapus ${user.role} ${user.full_name}`);
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// GET ALL PARENTS (ADMIN)
// ======================================
exports.getAllParents = async (req, res) => {
  try {
    const parents = await userService.getUsersByRole('ortu');
    return res.status(200).json({ success: true, data: parents });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data orang tua' });
  }
};

// ======================================
// CREATE PARENT
// ======================================
exports.createParent = async (req, res) => {
  try {
    const parentData = { ...req.body, role: 'ortu' };
    const result = await userService.createUser(parentData);
    return res.status(201).json({ success: true, message: 'Orang tua berhasil ditambahkan', data: result });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ======================================
// UPDATE PARENT
// ======================================
exports.updateParent = async (req, res) => {
  try {
    await userService.updateUser(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Data orang tua berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ======================================
// DELETE PARENT
// ======================================
exports.deleteParent = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(200).json({ success: true, message: 'Data orang tua berhasil dihapus' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// ======================================
// GET ALL STUDENTS (FOR DROPDOWN)
// ======================================
exports.getAllStudents = async (req, res) => {
  try {
    const students = await userService.getUsersByRole('siswa');
    const simplified = students.map(s => ({
      _id: s._id,
      full_name: s.full_name,
      nis: s.nis
    }));
    return res.status(200).json({ success: true, data: simplified });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data siswa' });
  }
};