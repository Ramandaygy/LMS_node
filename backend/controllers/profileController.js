const { findUserById, userModels, verifyPassword } = require('../utils/userHelper');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongoose').Types;

// GET /api/profile - Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const user = await findUserById(userId, role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Hapus password dari response
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/profile - Update current user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const data = req.body;

    const updateData = { updated_at: new Date() };

    // Update allowed fields
    const allowedFields = ['full_name'];
    for (let field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    // Update profile fields (bio, phone, address)
    const profileFields = ['bio', 'phone', 'address'];
    for (let field of profileFields) {
      if (data[field] !== undefined) {
        updateData[`profile.${field}`] = data[field];
      }
    }

    // Role-specific updates
    if (role === 'siswa' && data.class !== undefined) {
      updateData.class = data.class; // field 'class' di siswa (bisa class_id)
    } else if (role === 'guru' && data.subjects !== undefined) {
      updateData.subjects = data.subjects;
    }

    if (Object.keys(updateData).length > 1) { // selain updated_at
      const Model = userModels[role];
      if (!Model) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      await Model.findByIdAndUpdate(userId, { $set: updateData });
    }

    const user = await findUserById(userId, role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/profile/change-password - Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await findUserById(userId, role);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await verifyPassword(user, old_password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);

    const Model = userModels[role];
    if (!Model) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await Model.findByIdAndUpdate(userId, {
      $set: { password: hashed, updated_at: new Date() }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/profile/avatar - Upload profile avatar
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (req.file.filename === '') {
      return res.status(400).json({ error: 'No file selected' });
    }

    // Simpan URL avatar (misal disimpan di folder uploads)
    // Sesuaikan dengan kebutuhan penyimpanan (local, cloud, dll)
    const avatarUrl = `/uploads/avatars/${userId}.jpg`; // contoh

    const Model = userModels[role];
    if (!Model) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await Model.findByIdAndUpdate(userId, {
      $set: { 'profile.avatar': avatarUrl, updated_at: new Date() }
    });

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/profile/logout - Logout (client-side token removal)
exports.logout = (req, res) => {
  // Client akan menghapus token dari localStorage
  res.json({ message: 'Logout successful' });
};