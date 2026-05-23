const User = require('../models/UserSiswa');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongoose').Types;

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const data = req.body;
    const updateData = { updatedAt: new Date() };

    // Allowed fields
    const allowed = ['full_name'];
    for (let field of allowed) {
      if (data[field]) updateData[field] = data[field];
    }
    // Profile fields
    const profileFields = ['bio', 'phone', 'address'];
    for (let field of profileFields) {
      if (data[field]) updateData[`profile.${field}`] = data[field];
    }
    // Role-specific
    if (role === 'siswa' && data.class) updateData['profile.class'] = data.class;
    if (role === 'guru' && data.subjects) updateData['profile.subjects'] = data.subjects;

    await User.findByIdAndUpdate(userId, { $set: updateData });
    const updated = await User.findById(userId).select('-password');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Old password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);
    user.password = hashed;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Misal file sudah diupload ke folder uploads, simpan URL-nya
    const avatarUrl = `/uploads/avatars/${req.user.id}.jpg`;
    await User.findByIdAndUpdate(req.user.id, { $set: { 'profile.avatar': avatarUrl } });
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logout = (req, res) => {
  // Client hapus token, kita hanya beri respons
  res.json({ message: 'Logout successful' });
};