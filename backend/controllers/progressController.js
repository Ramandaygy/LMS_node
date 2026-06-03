const progressService = require('../services/progressService');
const mongoose = require('mongoose');

exports.getChildProgress = async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;
    // Verifikasi bahwa anak milik orang tua ini
    const ortuCollection = mongoose.connection.collection('users_ortu');
    const parent = await ortuCollection.findOne({ _id: new mongoose.Types.ObjectId(parentId) });
    if (!parent || !parent.children || !parent.children.some(id => id.toString() === childId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const progress = await progressService.getStudentProgress(childId);
    res.json({ success: true, data: progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};