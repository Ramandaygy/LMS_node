const ForumDiscussion = require('../models/ForumDiscussion');

// Get Discussions for Subject or Material
exports.getDiscussions = async (req, res) => {
  try {
    const { subjectId, materialId } = req.query;

    let query = {};
    if (materialId) {
      query.material = materialId;
    } else if (subjectId) {
      query.subject = subjectId;
    }

    const discussions = await ForumDiscussion.find(query)
      .populate('author', 'full_name role username profileImage')
      .populate('replies.author', 'full_name role username profileImage')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    return res.json({ success: true, discussions });
  } catch (err) {
    console.error('Error fetching forum discussions:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat forum diskusi.' });
  }
};

// Create Discussion Topic
exports.createDiscussion = async (req, res) => {
  try {
    const { subjectId, materialId, title, content } = req.body;

    if (!subjectId || !title || !content) {
      return res.status(400).json({ success: false, message: 'Mata pelajaran, judul topik, dan isi pertanyaan wajib diisi.' });
    }

    const newDiscussion = new ForumDiscussion({
      subject: subjectId,
      material: materialId || null,
      author: req.user._id,
      title,
      content,
      replies: [],
      likes: []
    });

    await newDiscussion.save();

    const populated = await ForumDiscussion.findById(newDiscussion._id)
      .populate('author', 'full_name role username profileImage')
      .populate('subject', 'name code');

    return res.status(201).json({ success: true, message: 'Topik diskusi berhasil dibuat.', discussion: populated });
  } catch (err) {
    console.error('Error creating forum discussion:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat topik diskusi.' });
  }
};

// Add Reply to Discussion
exports.addReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Isi balasan tidak boleh kosong.' });
    }

    const discussion = await ForumDiscussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Topik diskusi tidak ditemukan.' });
    }

    discussion.replies.push({
      author: req.user._id,
      content,
      created_at: new Date()
    });

    await discussion.save();

    const updated = await ForumDiscussion.findById(discussionId)
      .populate('author', 'full_name role username profileImage')
      .populate('replies.author', 'full_name role username profileImage');

    return res.json({ success: true, message: 'Balasan berhasil ditambahkan.', discussion: updated });
  } catch (err) {
    console.error('Error adding reply:', err);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan balasan.' });
  }
};

// Toggle Like
exports.toggleLike = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await ForumDiscussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Topik diskusi tidak ditemukan.' });
    }

    const userId = req.user._id.toString();
    const likeIndex = discussion.likes.findIndex(id => id.toString() === userId);

    if (likeIndex > -1) {
      discussion.likes.splice(likeIndex, 1);
    } else {
      discussion.likes.push(req.user._id);
    }

    await discussion.save();

    return res.json({ success: true, likes: discussion.likes });
  } catch (err) {
    console.error('Error toggling like:', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses suka.' });
  }
};

// Delete Discussion Topic
exports.deleteDiscussion = async (req, res) => {
  try {
    const { discussionId } = req.params;

    const discussion = await ForumDiscussion.findById(discussionId);
    if (!discussion) {
      return res.status(404).json({ success: false, message: 'Topik diskusi tidak ditemukan.' });
    }

    // Only author or admin can delete
    if (discussion.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'guru') {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menghapus diskusi ini.' });
    }

    await ForumDiscussion.findByIdAndDelete(discussionId);

    return res.json({ success: true, message: 'Topik diskusi berhasil dihapus.' });
  } catch (err) {
    console.error('Error deleting discussion:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus topik diskusi.' });
  }
};
