const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const authMiddleware = require('../middleware/authMiddleware');

// ============================================================
// ROUTE UTAMA - CHAT LANGSUNG
// ============================================================

// GET - Ambil semua pesan (chat)
router.get('/messages', authMiddleware, forumController.getMessages);

// POST - Kirim pesan (chat)
router.post('/messages', authMiddleware, forumController.sendMessage);

// DELETE - Hapus pesan
router.delete('/messages/:id', authMiddleware, forumController.deleteMessage);

// ============================================================
// ROUTE KOMPATIBILITAS (untuk FE yang masih pakai endpoint lama)
// ============================================================

// GET - Ambil diskusi (redirect ke messages)
router.get('/discussions', authMiddleware, forumController.getDiscussions);

// POST - Buat diskusi (redirect ke sendMessage)
router.post('/discussions', authMiddleware, forumController.createDiscussion);

// POST - Reply (redirect ke sendMessage)
router.post('/discussions/:discussionId/reply', authMiddleware, forumController.addReply);

// POST - Like
router.post('/discussions/:discussionId/like', authMiddleware, forumController.toggleLike);

// DELETE - Hapus diskusi
router.delete('/discussions/:discussionId', authMiddleware, forumController.deleteDiscussion);

module.exports = router;