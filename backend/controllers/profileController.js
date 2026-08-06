const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// =====================================
// GET PROFILE
// =====================================

const findUserAndCollection = async (userId) => {
  const collections = ['users_admin', 'users_guru', 'users_siswa', 'users_ortu'];
  for (const name of collections) {
    const coll = mongoose.connection.collection(name);
    try {
      const user = await coll.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      if (user) {
        return { user, collection: coll, collectionName: name };
      }
    } catch (e) {
      // Ignore conversion error if ID is not ObjectId compatible
    }
  }
  return { user: null, collection: null, collectionName: null };
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ error: 'Invalid token: missing id' });
    }

    const { user, collectionName } = await findUserAndCollection(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Konversi ke object, hapus password
    const result = { ...user };
    delete result.password;

    const isTeacher = user.role === 'guru' || user.role === 'bk' || user.role === 'wakil_kurikulum' || collectionName === 'users_guru';

    // Populasi subjects dan classes
    if (isTeacher && user.subjects && user.subjects.length) {
      const Subject = require('../models/Subject'); // Model Subject normal
      const populatedSubjects = await Subject.find({ _id: { $in: user.subjects } });
      result.subjects = populatedSubjects;
    }
    if (isTeacher && user.classes && user.classes.length) {
      const Class = require('../models/Class');
      const populatedClasses = await Class.find({ _id: { $in: user.classes } });
      result.classes = populatedClasses;
    }
    if (user.role === 'siswa' && user.class_id) {
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
    const { user, collection } = await findUserAndCollection(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
    const { user, collection } = await findUserAndCollection(userId);

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
    const { user, collection } = await findUserAndCollection(userId);

    if (!user) return res.status(404).json({ error: 'User not found' });
    let avatarUrl = '';

    if (process.env.VERCEL === '1' && req.file.buffer) {
      const { uploadToSupabase } = require('../services/supabaseService');
      avatarUrl = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
    } else {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

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