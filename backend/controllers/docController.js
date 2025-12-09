const { Sequelize, Op } = require('sequelize');
const Topic = require('../models/topicModels');
const Document = require('../models/documentModels');
const usersController = require('./usersController');

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Helper function to extract base64 data from data URL
const extractBase64Data = (dataUrl) => {
  return dataUrl.replace(/^data:[^;]+;base64,/, '');
};

// Helper function to create data URL from base64
const createDataUrl = (base64Data, mimeType) => {
  return `data:${mimeType};base64,${base64Data}`;
};

module.exports = {
  // Get all topics with pagination
  getAllTopics: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = search ? {
        name: {
          [Op.iLike]: `%${search}%`
        }
      } : {};

      const { count, rows } = await Topic.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [{
          model: Document,
          as: 'documents',
          attributes: []
        }],
        attributes: {
          include: [
            [Sequelize.fn('COUNT', Sequelize.col('documents.id')), 'file_count']
          ]
        },
        group: ['Topic.id'],
        subQuery: false
      });

      // Calculate total file count for each topic
      const topicsWithCounts = await Promise.all(
        rows.map(async (topic) => {
          const documentCount = await Document.count({
            where: { topic_id: topic.id }
          });
          
          return {
            id: topic.id,
            name: topic.name,
            files: documentCount,
            max_files: topic.max_files,
            created_at: topic.created_at,
            updated_at: topic.updated_at
          };
        })
      );

      res.json({
        success: true,
        topics: topicsWithCounts,
        total: count.length, // Since we're using GROUP BY, count is an array
        totalPages: Math.ceil(count.length / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      console.error('Error fetching topics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch topics',
        error: error.message
      });
    }
  },

  // Create new topic
  createTopic: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Topic name is required'
        });
      }

      // Check if topic already exists
      const existingTopic = await Topic.findOne({
        where: {
          name: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('name')),
            Sequelize.fn('LOWER', name.trim())
          )
        }
      });

      if (existingTopic) {
        return res.status(400).json({
          success: false,
          message: 'Topic with this name already exists'
        });
      }

      const newTopic = await Topic.create({
        name: name.trim(),
        file_count: 0
      });

      res.status(201).json({
        success: true,
        message: 'Topic created successfully',
        topic: {
          id: newTopic.id,
          name: newTopic.name,
          files: 0,
          max_files: newTopic.max_files,
          created_at: newTopic.created_at,
          updated_at: newTopic.updated_at
        }
      });
    } catch (error) {
      console.error('Error creating topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create topic',
        error: error.message
      });
    }
  },

  // Update topic
  updateTopic: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Topic name is required'
        });
      }

      const topic = await Topic.findByPk(id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check if new name already exists (excluding current topic)
      const existingTopic = await Topic.findOne({
        where: {
          id: { [Op.ne]: id },
          name: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('name')),
            Sequelize.fn('LOWER', name.trim())
          )
        }
      });

      if (existingTopic) {
        return res.status(400).json({
          success: false,
          message: 'Topic with this name already exists'
        });
      }

      await topic.update({
        name: name.trim()
      });

      // Get updated document count
      const documentCount = await Document.count({
        where: { topic_id: id }
      });

      res.json({
        success: true,
        message: 'Topic updated successfully',
        topic: {
          id: topic.id,
          name: topic.name,
          files: documentCount,
          max_files: topic.max_files,
          created_at: topic.created_at,
          updated_at: topic.updated_at
        }
      });
    } catch (error) {
      console.error('Error updating topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update topic',
        error: error.message
      });
    }
  },

  // Delete topic
  deleteTopic: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;

      const topic = await Topic.findByPk(id);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Delete associated documents first (cascade delete)
      await Document.destroy({
        where: { topic_id: id }
      });

      await topic.destroy();

      res.json({
        success: true,
        message: 'Topic and all associated documents deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting topic:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete topic',
        error: error.message
      });
    }
  },

  // Get documents for a topic
  getTopicDocuments: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { topicId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Verify topic exists
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      const { count, rows } = await Document.findAndCountAll({
        where: { topic_id: topicId },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['uploaded_at', 'DESC']],
        attributes: ['id', 'name', 'original_name', 'file_type', 'size', 'mime_type', 'uploaded_at', 'updated_at']
      });

      const documents = rows.map(doc => ({
        id: doc.id,
        name: doc.name,
        original_name: doc.original_name,
        file_type: doc.file_type,
        size: doc.size,
        mime_type: doc.mime_type,
        uploaded_at: doc.uploaded_at,
        updated_at: doc.updated_at
      }));

      res.json({
        success: true,
        documents,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        topic: {
          id: topic.id,
          name: topic.name,
          max_files: topic.max_files
        }
      });
    } catch (error) {
      console.error('Error fetching topic documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: error.message
      });
    }
  },

  // Upload document
  uploadDocument: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { topicId } = req.params;
      const { file } = req.body;

      if (!file || !file.data || !file.name) {
        return res.status(400).json({
          success: false,
          message: 'File data is required'
        });
      }

      // Verify topic exists
      const topic = await Topic.findByPk(topicId);
      if (!topic) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      // Check file count limit
      const documentCount = await Document.count({
        where: { topic_id: topicId }
      });

      if (documentCount >= topic.max_files) {
        return res.status(400).json({
          success: false,
          message: `Topic cannot have more than ${topic.max_files} files`
        });
      }

      // Validate file size (50MB limit)
      const fileSize = Buffer.from(extractBase64Data(file.data), 'base64').length;
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes

      if (fileSize > maxSize) {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 50MB limit'
        });
      }

      // Check if document with same name already exists in this topic
      const existingDocument = await Document.findOne({
        where: {
          topic_id: topicId,
          name: file.name
        }
      });

      if (existingDocument) {
        return res.status(400).json({
          success: false,
          message: 'Document with this name already exists in the topic'
        });
      }

      // Extract file extension and type
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const mimeType = file.type || getMimeTypeFromExtension(fileExtension);

      const newDocument = await Document.create({
        topic_id: topicId,
        name: file.name,
        original_name: file.name,
        file_type: fileExtension.toUpperCase(),
        size: fileSize,
        data: extractBase64Data(file.data), // Store only base64 data without data URL prefix
        mime_type: mimeType
      });

      // Update topic file count
      await topic.update({
        file_count: documentCount + 1
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: newDocument.id,
          name: newDocument.name,
          original_name: newDocument.original_name,
          file_type: newDocument.file_type,
          size: newDocument.size,
          mime_type: newDocument.mime_type,
          uploaded_at: newDocument.uploaded_at
        }
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: error.message
      });
    }
  },

  // Get document data
  getDocument: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;

      const document = await Document.findByPk(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Create data URL from base64 data
      const dataUrl = createDataUrl(document.data, document.mime_type);

      res.json({
        success: true,
        document: {
          id: document.id,
          name: document.name,
          original_name: document.original_name,
          file_type: document.file_type,
          size: document.size,
          mime_type: document.mime_type,
          data: dataUrl, // Send as data URL for frontend
          uploaded_at: document.uploaded_at,
          updated_at: document.updated_at,
          topic_id: document.topic_id
        }
      });
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document',
        error: error.message
      });
    }
  },

  // Update document (for editable files)
  updateDocument: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const { content, name } = req.body;

      const document = await Document.findByPk(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const updates = {};
      
      if (name && name !== document.name) {
        // Check if new name already exists in the same topic
        const existingDocument = await Document.findOne({
          where: {
            topic_id: document.topic_id,
            name: name,
            id: { [Op.ne]: id }
          }
        });

        if (existingDocument) {
          return res.status(400).json({
            success: false,
            message: 'Document with this name already exists in the topic'
          });
        }
        updates.name = name;
      }

      if (content) {
        // For editable files, update the content
        const base64Data = extractBase64Data(content);
        updates.data = base64Data;
        updates.size = Buffer.from(base64Data, 'base64').length;
      }

      if (Object.keys(updates).length > 0) {
        await document.update(updates);
      }

      res.json({
        success: true,
        message: 'Document updated successfully',
        document: {
          id: document.id,
          name: document.name,
          original_name: document.original_name,
          file_type: document.file_type,
          size: document.size,
          mime_type: document.mime_type,
          uploaded_at: document.uploaded_at,
          updated_at: document.updated_at
        }
      });
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update document',
        error: error.message
      });
    }
  },

  // Rename document
  renameDocument: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Document name is required'
        });
      }

      const document = await Document.findByPk(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Check if new name already exists in the same topic
      const existingDocument = await Document.findOne({
        where: {
          topic_id: document.topic_id,
          name: name.trim(),
          id: { [Op.ne]: id }
        }
      });

      if (existingDocument) {
        return res.status(400).json({
          success: false,
          message: 'Document with this name already exists in the topic'
        });
      }

      await document.update({
        name: name.trim()
      });

      res.json({
        success: true,
        message: 'Document renamed successfully',
        document: {
          id: document.id,
          name: document.name,
          original_name: document.original_name,
          file_type: document.file_type,
          size: document.size,
          mime_type: document.mime_type,
          uploaded_at: document.uploaded_at,
          updated_at: document.updated_at
        }
      });
    } catch (error) {
      console.error('Error renaming document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rename document',
        error: error.message
      });
    }
  },

  // Delete document
  deleteDocument: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { id } = req.params;

      const document = await Document.findByPk(id);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      const topicId = document.topic_id;
      
      await document.destroy();

      // Update topic file count
      const documentCount = await Document.count({
        where: { topic_id: topicId }
      });

      await Topic.update(
        { file_count: documentCount },
        { where: { id: topicId } }
      );

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error.message
      });
    }
  },

  // Search documents
  searchDocuments: async (req, res) => {
    try {
      // Check if user exists and token is not revoked
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (usersController.isTokenRevoked(req.user.id.toString())) {
        return res.status(401).json({
          success: false,
          message: 'Token revoked. User account no longer exists.'
        });
      }

      const { q: searchQuery, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const { count, rows } = await Document.findAndCountAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchQuery}%` } },
            { original_name: { [Op.iLike]: `%${searchQuery}%` } }
          ]
        },
        include: [{
          model: Topic,
          as: 'topic',
          attributes: ['id', 'name']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['uploaded_at', 'DESC']],
        attributes: ['id', 'name', 'original_name', 'file_type', 'size', 'mime_type', 'uploaded_at']
      });

      const documents = rows.map(doc => ({
        id: doc.id,
        name: doc.name,
        original_name: doc.original_name,
        file_type: doc.file_type,
        size: doc.size,
        mime_type: doc.mime_type,
        uploaded_at: doc.uploaded_at,
        topic: doc.topic
      }));

      res.json({
        success: true,
        documents,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      console.error('Error searching documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search documents',
        error: error.message
      });
    }
  }
};

// Helper function to get MIME type from file extension
function getMimeTypeFromExtension(extension) {
  const mimeTypes = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}