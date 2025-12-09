const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  topic_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'topics',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  original_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  file_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  data: {
    type: DataTypes.TEXT, // Base64 encoded data
    allowNull: false
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
}, {
  tableName: 'documents',
  underscored: true,
  timestamps: true,
  createdAt: 'uploaded_at',
  updatedAt: 'updated_at'
});

// Associations for Document only
Document.associate = function(models) {
  Document.belongsTo(models.Topic, {
    foreignKey: 'topic_id',
    as: 'topic'
  });
};

module.exports = Document;