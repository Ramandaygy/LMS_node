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

// ======================================
// PROVISIONING EMAIL SENDER CONTROLLERS
// ======================================
const generateRandomPassword = () => {
  return 'smp' + Math.floor(10000 + Math.random() * 90000); // e.g. smp29381
};

exports.sendEmailSingle = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'Pengguna tidak memiliki email terdaftar' });
    }

    const tempPassword = generateRandomPassword();
    
    // Update password in database
    await userService.updateUser(id, { password: tempPassword });

    // Send email
    const emailService = require('../services/emailService');
    await emailService.sendCredentialsEmail(user.email, user.username, tempPassword, user.full_name, user.role);

    // Log the activity
    const { logActivity } = require('../utils/activityLogger');
    await logActivity(req, 'PROVISION_EMAIL_SINGLE', `Sent credentials email to ${user.full_name} (${user.email})`);

    return res.status(200).json({ success: true, message: `Email kredensial berhasil dikirim ke ${user.full_name}!` });
  } catch (err) {
    console.error('Error sending single email:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengirim email.' });
  }
};

exports.sendEmailAll = async (req, res) => {
  try {
    const allUsers = await userService.getAllUsers();
    // Filter out super_admin and users without email
    const targetUsers = allUsers.filter(u => u.role !== 'super_admin' && u.email);

    if (targetUsers.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada pengguna yang memenuhi syarat untuk dikirimi email.' });
    }

    const emailService = require('../services/emailService');
    const { logActivity } = require('../utils/activityLogger');

    let successCount = 0;
    for (const user of targetUsers) {
      try {
        const tempPassword = generateRandomPassword();
        await userService.updateUser(user._id || user.id, { password: tempPassword });
        await emailService.sendCredentialsEmail(user.email, user.username, tempPassword, user.full_name, user.role);
        successCount++;
      } catch (userErr) {
        console.error(`Failed to send email to ${user.full_name}:`, userErr.message);
      }
    }

    await logActivity(req, 'PROVISION_EMAIL_ALL', `Sent credentials email to ${successCount} users`);

    return res.status(200).json({ success: true, message: `Kredensial berhasil dikirim ke ${successCount} pengguna!` });
  } catch (err) {
    console.error('Error sending bulk emails:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengirim email massal.' });
  }
};