const express = require('express');
const router = express.Router();
const forumController = require('../controllers/forumController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/discussions', forumController.getDiscussions);
router.post('/discussions', forumController.createDiscussion);
router.post('/discussions/:discussionId/reply', forumController.addReply);
router.post('/discussions/:discussionId/like', forumController.toggleLike);
router.delete('/discussions/:discussionId', forumController.deleteDiscussion);

module.exports = router;
