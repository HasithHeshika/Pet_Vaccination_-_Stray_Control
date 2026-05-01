const express = require('express');
const router = express.Router();
const LostAndFoundController = require('../controllers/lostAndFoundController');
const auth = require('../middleware/auth');

// Public endpoints
// Get all active lost/found posts
router.get('/posts', LostAndFoundController.getAllPosts);

// Get single post by ID
router.get('/posts/:id', LostAndFoundController.getPostById);

// Search posts by location and filters
router.get('/search', LostAndFoundController.searchPosts);

// Authenticated endpoints
// Create new lost/found post
router.post('/posts', auth, LostAndFoundController.createPost);

// Update post
router.put('/posts/:id', auth, LostAndFoundController.updatePost);

// Delete post
router.delete('/posts/:id', auth, LostAndFoundController.deletePost);

// Add response/comment to post
router.post('/posts/:id/responses', auth, LostAndFoundController.addResponse);

// Mark post as resolved
router.put('/posts/:id/resolve', auth, LostAndFoundController.resolvePost);

// Report/flag post
router.post('/posts/:id/flag', LostAndFoundController.flagPost);

// Get user's posts
router.get('/user/posts', auth, LostAndFoundController.getUserPosts);

// Get matching posts (for recommendations)
router.get('/posts/:id/matches', LostAndFoundController.getMatchingPosts);

module.exports = router;
