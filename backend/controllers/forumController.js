const mongoose = require('mongoose');

// ============================================================
// GET - Ambil semua pesan forum (chat langsung)
// ============================================================
exports.getMessages = async (req, res) => {
  try {
    const { subjectId, materialId, classId, sessionNumber } = req.query;

    // Build filter
    const filter = {};
    if (materialId && mongoose.Types.ObjectId.isValid(materialId)) {
      filter.material_id = new mongoose.Types.ObjectId(materialId);
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subject_id = new mongoose.Types.ObjectId(subjectId);
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.class_id = new mongoose.Types.ObjectId(classId);
    }
    if (sessionNumber) {
      filter.session_number = parseInt(sessionNumber);
    }

    // Gunakan collection terpisah untuk messages (bukan ForumDiscussion)
    const forumCol = mongoose.connection.collection('forum_messages');
    
    // Coba cari di collection forum_messages
    let messages = await forumCol.find(filter)
      .sort({ created_at: 1 })
      .toArray();

    // Jika tidak ada, coba ambil dari collection ForumDiscussion (migrasi)
    if (messages.length === 0) {
      const ForumDiscussion = require('../models/ForumDiscussion');
      const discussions = await ForumDiscussion.find(filter)
        .populate('author', 'full_name role username profileImage')
        .populate('replies.author', 'full_name role username profileImage')
        .sort({ createdAt: 1 });

      // Konversi ke format messages
      discussions.forEach(d => {
        // Topik utama sebagai message
        messages.push({
          _id: d._id,
          user_id: d.author?._id || d.author,
          content: `${d.title}: ${d.content}`,
          isTeacher: d.author?.role === 'guru' || d.author?.role === 'admin',
          created_at: d.createdAt,
          author: d.author,
          isTopic: true
        });
        // Replies sebagai messages
        (d.replies || []).forEach(r => {
          messages.push({
            _id: r._id || new mongoose.Types.ObjectId(),
            user_id: r.author?._id || r.author,
            content: r.content,
            isTeacher: r.author?.role === 'guru' || r.author?.role === 'admin',
            created_at: r.created_at || new Date(),
            author: r.author,
            isReply: true
          });
        });
      });

      // Sort by created_at
      messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    // Enrich dengan data user
    const userIds = messages.map(m => m.user_id?.toString()).filter(Boolean);
    const guruCol = mongoose.connection.collection('users_guru');
    const siswaCol = mongoose.connection.collection('users_siswa');
    
    const userMap = {};
    
    if (userIds.length > 0) {
      const guruUsers = await guruCol.find({ 
        _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).toArray();
      guruUsers.forEach(g => {
        userMap[g._id.toString()] = { 
          full_name: g.full_name, 
          role: 'guru',
          isTeacher: true
        };
      });
      
      const siswaUsers = await siswaCol.find({ 
        _id: { $in: userIds.map(id => new mongoose.Types.ObjectId(id)) }
      }).toArray();
      siswaUsers.forEach(s => {
        userMap[s._id.toString()] = { 
          full_name: s.full_name, 
          role: 'siswa',
          isTeacher: false
        };
      });
    }

    const enrichedMessages = messages.map(m => {
      const userId = m.user_id?.toString();
      const userInfo = userMap[userId] || { 
        full_name: 'Pengguna', 
        role: 'siswa',
        isTeacher: false
      };
      
      return {
        ...m,
        _id: m._id || m.id,
        author: m.author || {
          full_name: userInfo.full_name,
          role: userInfo.role
        },
        isTeacher: m.isTeacher || userInfo.isTeacher,
        user_name: userInfo.full_name,
        user_id: userId
      };
    });

    res.json({ 
      success: true, 
      messages: enrichedMessages 
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// POST - Kirim pesan forum (chat langsung)
// ============================================================
exports.sendMessage = async (req, res) => {
  try {
    const { subjectId, materialId, classId, sessionNumber, content } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role || 'siswa';

    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Pesan tidak boleh kosong' 
      });
    }

    const forumCol = mongoose.connection.collection('forum_messages');
    
    const newMessage = {
      user_id: new mongoose.Types.ObjectId(userId),
      subject_id: subjectId && mongoose.Types.ObjectId.isValid(subjectId) ? new mongoose.Types.ObjectId(subjectId) : null,
      material_id: materialId && mongoose.Types.ObjectId.isValid(materialId) ? new mongoose.Types.ObjectId(materialId) : null,
      class_id: classId && mongoose.Types.ObjectId.isValid(classId) ? new mongoose.Types.ObjectId(classId) : null,
      session_number: sessionNumber ? parseInt(sessionNumber) : null,
      content: content.trim(),
      isTeacher: userRole === 'guru' || userRole === 'admin',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await forumCol.insertOne(newMessage);

    // Ambil data user untuk response
    let userInfo = { full_name: 'Pengguna', role: userRole };
    
    if (userRole === 'guru' || userRole === 'admin') {
      const guruCol = mongoose.connection.collection('users_guru');
      const guru = await guruCol.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      if (guru) {
        userInfo.full_name = guru.full_name || 'Guru';
        userInfo.role = 'guru';
      }
    } else {
      const siswaCol = mongoose.connection.collection('users_siswa');
      const siswa = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(userId) });
      if (siswa) {
        userInfo.full_name = siswa.full_name || 'Siswa';
        userInfo.role = 'siswa';
      }
    }

    const message = {
      ...newMessage,
      _id: result.insertedId,
      author: {
        full_name: userInfo.full_name,
        role: userInfo.role
      },
      isTeacher: userRole === 'guru' || userRole === 'admin',
      user_name: userInfo.full_name
    };

    res.json({ 
      success: true, 
      message: message
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// DELETE - Hapus pesan forum
// ============================================================
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const forumCol = mongoose.connection.collection('forum_messages');
    const message = await forumCol.findOne({ 
      _id: new mongoose.Types.ObjectId(id) 
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pesan tidak ditemukan' 
      });
    }

    // Hanya pemilik pesan atau admin/guru yang bisa hapus
    if (message.user_id.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Tidak memiliki akses untuk menghapus pesan ini' 
      });
    }

    await forumCol.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    res.json({ 
      success: true, 
      message: 'Pesan berhasil dihapus' 
    });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET - Ambil diskusi berdasarkan subject/material (untuk kompatibilitas)
// ============================================================
exports.getDiscussions = async (req, res) => {
  // Redirect ke getMessages untuk konsistensi
  return exports.getMessages(req, res);
};

// ============================================================
// POST - Create discussion (kompatibilitas)
// ============================================================
exports.createDiscussion = async (req, res) => {
  // Redirect ke sendMessage
  return exports.sendMessage(req, res);
};

// ============================================================
// POST - Add reply (kompatibilitas)
// ============================================================
exports.addReply = async (req, res) => {
  // Redirect ke sendMessage
  return exports.sendMessage(req, res);
};

// ============================================================
// POST - Toggle like (kompatibilitas)
// ============================================================
exports.toggleLike = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const userId = req.user.id;

    const forumCol = mongoose.connection.collection('forum_messages');
    const message = await forumCol.findOne({ 
      _id: new mongoose.Types.ObjectId(discussionId) 
    });

    if (!message) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pesan tidak ditemukan' 
      });
    }

    // Toggle like (gunakan array likes di message)
    const likeIndex = (message.likes || []).findIndex(id => id.toString() === userId);
    const update = {};
    
    if (likeIndex > -1) {
      update.$pull = { likes: new mongoose.Types.ObjectId(userId) };
    } else {
      update.$push = { likes: new mongoose.Types.ObjectId(userId) };
    }

    const result = await forumCol.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(discussionId) },
      update,
      { returnDocument: 'after' }
    );

    res.json({ 
      success: true, 
      likes: result.value?.likes || [] 
    });
  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// DELETE - Delete discussion (kompatibilitas)
// ============================================================
exports.deleteDiscussion = async (req, res) => {
  return exports.deleteMessage(req, res);
};