const LostAndFound = require('../models/LostAndFound');
const { validationResult } = require('express-validator');

// Get all active lost/found posts with pagination
exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, type = 'all' } = req.query;
    
    // Filter by post type
    const filter = type !== 'all' ? { postType: type, status: 'active' } : { status: 'active' };
    
    const posts = await LostAndFound.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate('postedBy.userId', 'name profilePicture');
    
    const total = await LostAndFound.countDocuments(filter);
    
    res.json({
      success: true,
      data: posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single post by ID
exports.getPostById = async (req, res) => {
  try {
    const post = await LostAndFound.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('postedBy.userId', 'name phone email profilePicture');
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search posts by location, pet type, and keywords
exports.searchPosts = async (req, res) => {
  try {
    const { query, city, petSpecies, radius = 10 } = req.query;
    
    let searchFilter = { status: 'active' };
    
    // Text search
    if (query) {
      searchFilter.$text = { $search: query };
    }
    
    // City filter
    if (city) {
      searchFilter['location.city'] = new RegExp(city, 'i');
    }
    
    // Pet species filter
    if (petSpecies) {
      searchFilter['petDetails.species'] = petSpecies;
    }
    
    const results = await LostAndFound.find(searchFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('postedBy.userId', 'name profilePicture');
    
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new lost/found post
exports.createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    const { postType, title, description, petDetails, location, dateOfIncident, lastSeenTime, reward, tags } = req.body;
    
    const newPost = new LostAndFound({
      postType,
      title,
      description,
      petDetails,
      location,
      dateOfIncident,
      lastSeenTime,
      reward,
      tags,
      postedBy: {
        userId: req.user.id,
        name: req.user.name,
        phone: req.body.phone,
        email: req.user.email
      }
    });
    
    await newPost.save();
    
    res.status(201).json({
      success: true,
      message: 'Lost & Found post created successfully',
      data: newPost
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    let post = await LostAndFound.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Verify user owns the post
    if (post.postedBy.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this post' });
    }
    
    const { title, description, petDetails, location, status, tags } = req.body;
    
    if (title) post.title = title;
    if (description) post.description = description;
    if (petDetails) post.petDetails = { ...post.petDetails, ...petDetails };
    if (location) post.location = { ...post.location, ...location };
    if (status) post.status = status;
    if (tags) post.tags = tags;
    
    post.updatedAt = Date.now();
    await post.save();
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      data: post
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const post = await LostAndFound.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    if (post.postedBy.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }
    
    await LostAndFound.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add response/comment to post
exports.addResponse = async (req, res) => {
  try {
    const { message, contact } = req.body;
    
    const post = await LostAndFound.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          responses: {
            userId: req.user.id,
            userName: req.user.name,
            message,
            contact,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({
      success: true,
      message: 'Response added successfully',
      data: post
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark post as resolved
exports.resolvePost = async (req, res) => {
  try {
    const { matchedPostId, notes } = req.body;
    
    const post = await LostAndFound.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedWith: {
          matchedPostId,
          resolvedDate: new Date(),
          notes
        }
      },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({
      success: true,
      message: 'Post marked as resolved',
      data: post
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Flag/report post
exports.flagPost = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const post = await LostAndFound.findByIdAndUpdate(
      req.params.id,
      {
        isFlagged: true,
        flagReason: reason
      },
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    res.json({
      success: true,
      message: 'Post flagged successfully',
      data: post
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's posts
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await LostAndFound.find({ 'postedBy.userId': req.user.id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get matching posts (recommendations)
exports.getMatchingPosts = async (req, res) => {
  try {
    const post = await LostAndFound.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Find posts with similar pet details and opposite type
    const oppositeType = post.postType === 'lost' ? 'found' : 'lost';
    
    const matches = await LostAndFound.find({
      _id: { $ne: req.params.id },
      postType: oppositeType,
      status: 'active',
      'petDetails.species': post.petDetails.species,
      'location.city': post.location.city
    })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
