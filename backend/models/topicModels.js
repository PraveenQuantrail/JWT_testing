const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Topic = sequelize.define('Topic', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  file_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  max_files: {
    type: DataTypes.INTEGER,
    defaultValue: 200
  }
}, {
  tableName: 'topics',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Associations for Topic only
Topic.associate = function(models) {
  Topic.hasMany(models.Document, {
    foreignKey: 'topic_id',
    as: 'documents'
  });
};

module.exports = Topic;