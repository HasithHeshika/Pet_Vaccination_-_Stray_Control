const request = require('supertest');
const mongoose = require('mongoose');
const LostAndFound = require('../models/LostAndFound');
const User = require('../models/User');

// Assuming you have an express app exported from server.js
const app = require('../server');

describe('Lost & Found API Tests', () => {
  let postId;
  let userId;
  let token;
  
  beforeAll(async () => {
    // Connect to test MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create test user
    const user = new User({
      fullName: 'Test User',
      email: 'testuser@example.com',
      password: 'Password123',
      phone: '0771234567',
      nicNumber: 'TEST001'
    });
    await user.save();
    userId = user._id;
  });
  
  afterAll(async () => {
    // Clean up
    await LostAndFound.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });
  
  describe('GET /api/lost-and-found/posts', () => {
    test('Should get all active posts', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/posts')
        .query({ page: 1, limit: 10 });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
    
    test('Should filter by post type', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/posts')
        .query({ type: 'lost' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.data.every(post => post.postType === 'lost')).toBe(true);
    });
  });
  
  describe('POST /api/lost-and-found/posts', () => {
    test('Should create a new lost post', async () => {
      const postData = {
        postType: 'lost',
        title: 'Lost Golden Retriever',
        description: 'Lost near Galle Face',
        phone: '0771234567',
        petDetails: {
          species: 'dog',
          breed: 'Golden Retriever',
          color: 'Golden',
          size: 'large',
          age: '5 years',
          distinguishingFeatures: 'White patch on chest'
        },
        location: {
          address: 'Galle Face, Colombo',
          city: 'Colombo',
          latitude: 6.9271,
          longitude: 79.8456
        },
        dateOfIncident: new Date(),
        lastSeenTime: '10:30 AM'
      };
      
      const response = await request(app)
        .post('/api/lost-and-found/posts')
        .set('Authorization', `Bearer ${token}`)
        .send(postData);
      
      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.postType).toBe('lost');
      
      postId = response.body.data._id;
    });
    
    test('Should create a found post', async () => {
      const postData = {
        postType: 'found',
        title: 'Found a stray dog',
        description: 'Found near market',
        phone: '0789876543',
        petDetails: {
          species: 'dog',
          breed: 'Mixed',
          color: 'Brown',
          size: 'medium'
        },
        location: {
          address: 'Market Street',
          city: 'Nugegoda'
        },
        dateOfIncident: new Date()
      };
      
      const response = await request(app)
        .post('/api/lost-and-found/posts')
        .set('Authorization', `Bearer ${token}`)
        .send(postData);
      
      expect(response.statusCode).toBe(201);
      expect(response.body.data.postType).toBe('found');
    });
  });
  
  describe('GET /api/lost-and-found/posts/:id', () => {
    test('Should get a single post by ID', async () => {
      const response = await request(app)
        .get(`/api/lost-and-found/posts/${postId}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(postId.toString());
    });
    
    test('Should increment view count', async () => {
      const post = await LostAndFound.findById(postId);
      const initialViews = post.views;
      
      await request(app)
        .get(`/api/lost-and-found/posts/${postId}`);
      
      const updatedPost = await LostAndFound.findById(postId);
      expect(updatedPost.views).toBe(initialViews + 1);
    });
    
    test('Should return 404 for non-existent post', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/lost-and-found/posts/${fakeId}`);
      
      expect(response.statusCode).toBe(404);
    });
  });
  
  describe('GET /api/lost-and-found/search', () => {
    test('Should search by keyword', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/search')
        .query({ query: 'dog' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    test('Should search by city', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/search')
        .query({ city: 'Colombo' });
      
      expect(response.statusCode).toBe(200);
    });
    
    test('Should search by pet species', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/search')
        .query({ petSpecies: 'dog' });
      
      expect(response.statusCode).toBe(200);
    });
  });
  
  describe('PUT /api/lost-and-found/posts/:id', () => {
    test('Should update a post', async () => {
      const updateData = {
        title: 'Lost Golden Retriever - UPDATED',
        description: 'Updated with new sightings'
      };
      
      const response = await request(app)
        .put(`/api/lost-and-found/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.data.title).toBe(updateData.title);
    });
  });
  
  describe('POST /api/lost-and-found/posts/:id/responses', () => {
    test('Should add response to post', async () => {
      const responseData = {
        message: 'I saw this dog near the railway station',
        contact: '0771234567'
      };
      
      const response = await request(app)
        .post(`/api/lost-and-found/posts/${postId}/responses`)
        .set('Authorization', `Bearer ${token}`)
        .send(responseData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.data.responses.length).toBeGreaterThan(0);
    });
  });
  
  describe('PUT /api/lost-and-found/posts/:id/resolve', () => {
    test('Should mark post as resolved', async () => {
      const resolveData = {
        notes: 'Pet was successfully reunited'
      };
      
      const response = await request(app)
        .put(`/api/lost-and-found/posts/${postId}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send(resolveData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.data.status).toBe('resolved');
    });
  });
  
  describe('POST /api/lost-and-found/posts/:id/flag', () => {
    test('Should flag a post', async () => {
      const flagData = {
        reason: 'Suspicious post'
      };
      
      const response = await request(app)
        .post(`/api/lost-and-found/posts/${postId}/flag`)
        .send(flagData);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.data.isFlagged).toBe(true);
    });
  });
  
  describe('GET /api/lost-and-found/user/posts', () => {
    test('Should get user posts', async () => {
      const response = await request(app)
        .get('/api/lost-and-found/user/posts')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
  
  describe('DELETE /api/lost-and-found/posts/:id', () => {
    test('Should delete a post', async () => {
      const response = await request(app)
        .delete(`/api/lost-and-found/posts/${postId}`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.statusCode).toBe(200);
      
      // Verify it's deleted
      const deletedPost = await LostAndFound.findById(postId);
      expect(deletedPost).toBeNull();
    });
  });
});
