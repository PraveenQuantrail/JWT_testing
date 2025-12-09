const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authDatabase = require('../middlewares/authDatabase');
const authorizeRoles = require('../middlewares/authorizeRole');
const userAccessControl = require('../middlewares/userAccessControl');

// Define roles for user management
const userAdminRoles = ['Admin', 'Super Admin'];

// Get all users - GET /api/users
router.get('/', authDatabase, authorizeRoles(userAdminRoles), usersController.getAllUsers);

// Create a new user - POST /api/users
router.post('/', authDatabase, authorizeRoles(userAdminRoles), usersController.createUser);

// Update a user - PUT /api/users/:id
router.put('/:id', authDatabase, userAccessControl, usersController.updateUser);

// Delete a user - DELETE /api/users/:id
router.delete('/:id', authDatabase, userAccessControl, authorizeRoles(userAdminRoles), usersController.deleteUser);

module.exports = router;