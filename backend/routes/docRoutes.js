const express = require('express');
const router = express.Router();
const docController = require('../controllers/docController');
const authDatabase = require('../middlewares/authDatabase');

// All routes require authentication
router.use(authDatabase);

// Topic routes
// Get all topics - GET /api/docs/topics
router.get('/topics', docController.getAllTopics);

// Create a new topic - POST /api/docs/topics
router.post('/topics', docController.createTopic);

// Update a topic - PUT /api/docs/topics/:id
router.put('/topics/:id', docController.updateTopic);

// Delete a topic - DELETE /api/docs/topics/:id
router.delete('/topics/:id', docController.deleteTopic);


// Document routes
// Get all documents under a topic - GET /api/docs/topics/:topicId/documents
router.get('/topics/:topicId/documents', docController.getTopicDocuments);

// Upload a new document to a topic - POST /api/docs/topics/:topicId/documents
router.post('/topics/:topicId/documents', docController.uploadDocument);

// Get a single document - GET /api/docs/documents/:id
router.get('/documents/:id', docController.getDocument);

// Update a document - PUT /api/docs/documents/:id
router.put('/documents/:id', docController.updateDocument);

// Delete a document - DELETE /api/docs/documents/:id
router.delete('/documents/:id', docController.deleteDocument);

// Rename a document - POST /api/docs/documents/:id/rename
router.post('/documents/:id/rename', docController.renameDocument);


// Search routes
// Search documents - GET /api/docs/search
router.get('/search', docController.searchDocuments);

module.exports = router;