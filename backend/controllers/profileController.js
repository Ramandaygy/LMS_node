const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// =====================================
// GET PROFILE
// =====================================

const getCollectionByRole = (role) => {
  switch (role) {
    case 'admin':
      return mongoose.connection.collection('users_admin');
    case 'guru':
      return mongoose.connection.collection('users_guru');
    case 'siswa':
      return mongoose.connection.collection('users_siswa');
    case 'ortu':
      return mongoose.connection.collection('users_ortu');
    default:
      throw new Error('Invalid role');
  }
};

exports.getProfile = async (req, res) => {
  try {
    // Ambil userId dari token (req.user.id)
    const userId = req.user.id; // atau req.user._id
    const userRole = req.user.role;

    if (!userId || !userRole) {
      return res.status(400).json({ error: 'Invalid token: missing id or role' });
    }

    const collection = getCollectionByRole(userRole);
    const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Konversi ke object, hapus password
    const result = { ...user };
    delete result.password;

    // Populasi subjects dan classes (jika diperlukan) bisa dilakukan manual
    // Tapi karena kita pakai collection terpisah, populate tidak langsung.
    // Untuk sementara, kirim data apa adanya. Jika perlu subjects/classes,
    // lakukan lookup manual ke collection Subject dan Class.

    // Jika ingin populate subjects (contoh untuk guru):
    if (userRole === 'guru' && user.subjects && user.subjects.length) {
      const Subject = require('../models/Subject'); // Model Subject normal
      const populatedSubjects = await Subject.find({ _id: { $in: user.subjects } });
      result.subjects = populatedSubjects;
    }
    if (userRole === 'guru' && user.classes && user.classes.length) {
      const Class = require('../models/Class');
      const populatedClasses = await Class.find({ _id: { $in: user.classes } });
      result.classes = populatedClasses;
    }
    if (userRole === 'siswa' && user.class_id) {
      const Class = require('../models/Class');
      const populatedClass = await Class.findById(user.class_id);
      result.class_id = populatedClass;
    }

    return res.json(result);
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: err.message });
  }
};
// =====================================
// UPDATE PROFILE
// =====================================

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, bio, address } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const collection = getCollectionByRole(userRole);
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData['profile.bio'] = bio;
    if (address !== undefined) updateData['profile.address'] = address;
    await collection.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: updateData });
    // ambil data terbaru
    const updatedUser = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });
    delete updatedUser.password;
    return res.json(updatedUser);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
// =====================================
// CHANGE PASSWORD
// =====================================

exports.changePassword = async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const collection = getCollectionByRole(userRole);
    const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Konversi password jika dalam bentuk Buffer (BSON Binary)
    let hashedPassword = user.password;
    if (user.password && typeof user.password !== 'string') {
      if (user.password.buffer) {
        hashedPassword = Buffer.from(user.password.buffer).toString('utf8');
      }
    }

    const isMatch = await bcrypt.compare(old_password, hashedPassword);
    if (!isMatch) return res.status(401).json({ error: 'Old password is incorrect' });

    const newHashed = await bcrypt.hash(new_password, 10);
    await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { password: newHashed } }
    );

    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// =====================================
// UPLOAD AVATAR
// =====================================

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user.id;
    const userRole = req.user.role;
    const collection = getCollectionByRole(userRole);
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { profileImage: avatarUrl } }
    );

    return res.json({ success: true, avatar_url: avatarUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// =====================================
// LOGOUT
// =====================================

exports.logout = (
  req,
  res
) => {

  return res.json({
    message:
      'Logout successful'
  });
};