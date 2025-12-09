const { Op } = require('sequelize');
const User = require('../models/usersModels');
const { generateStrongPassword, sendInitialPasswordEmail } = require('../utils/emailSender');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In-memory revoked tokens/user IDs
const revokedTokens = new Set();

const availableRoles = ['Admin', 'Editor', 'Readonly'];
const allRoles = ['Super Admin', 'Admin', 'Editor', 'Readonly'];
const SUPER_ADMIN_LIMIT = 3;

// Initialize super admin if no users exist
exports.initializeSuperAdmin = async () => {
  try {
    const userCount = await User.count();

    if (userCount === 0) {
      console.log('No users found. Creating super admin...');

      const superAdminData = {
        name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
        email: process.env.SUPER_ADMIN_EMAIL,
        phone: process.env.SUPER_ADMIN_PHONE,
        address: process.env.SUPER_ADMIN_ADDRESS,
        role: 'Super Admin',
        status: 'Active',
        twoFA: false,
        is_super_admin: true
      };

      const initialPassword = generateStrongPassword();
      console.log(`Generated initial password for super admin: ${initialPassword}`);

      const superAdmin = await User.create({
        ...superAdminData,
        password: initialPassword
      });

      try {
        await sendInitialPasswordEmail(
          superAdminData.email,
          superAdminData.name,
          initialPassword
        );
      } catch (err) {
        console.error('Error sending initial password email for super admin:', err);
      }

      console.log(`Super admin created successfully.`);
    } else {
      console.log('Users already exist. Skipping super admin creation.');
      // Ensure existing super admins have correct role and flag
      await User.update(
        { role: 'Super Admin', is_super_admin: true },
        { where: { is_super_admin: true } }
      );
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// Get count of super admins
const getSuperAdminCount = async () => {
  return await User.count({ where: { role: 'Super Admin', is_super_admin: true } });
};

// Helper: is current user a (real) super admin
function isCurrentUserSuperAdmin(req) {
  // Use both role and is_super_admin
  return req.user && req.user.role === 'Super Admin' && req.user.is_super_admin === true;
}

// Helper: is current user an admin (but NOT super admin)
function isCurrentUserAdmin(req) {
  return req.user && req.user.role === 'Admin' && !req.user.is_super_admin;
}

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res, next) => {
  try {
    // Check if user token is revoked (account deleted)
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { page = 1, limit = 10, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (role && role !== 'All Roles') where.role = role;
    if (status && status !== 'All Status') where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['role', 'DESC'], // Super Admin first
        ['created_at', 'ASC'] // Earliest first
      ],
      attributes: { exclude: ['password'] }
    });

    // Determine available roles based on current user
    let rolesToShow = availableRoles;
    if (isCurrentUserSuperAdmin(req)) {
      rolesToShow = allRoles;
    } else if (isCurrentUserAdmin(req)) {
      // Admins should only be able to create Editor and Readonly users
      rolesToShow = ['Editor', 'Readonly'];
    }

    res.json({
      users,
      total: count,
      availableRoles: rolesToShow
    });
  } catch (error) {
    next(error);
  }
};

// Create a new user
exports.createUser = async (req, res, next) => {
  try {
    // Check if user token is revoked (account deleted)
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    // Only Admin and Super Admin can create users (Editors/Readonly cannot)
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!(isCurrentUserSuperAdmin(req) || isCurrentUserAdmin(req))) {
      return res.status(403).json({ success: false, message: 'You do not have permission to create users' });
    }

    const { name, email, phone, role, address } = req.body;

    if (!name || !email || !phone || !role || !address) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Admins can only create Editor and Readonly users
    if (isCurrentUserAdmin(req)) {
      if (role === 'Admin' || role === 'Super Admin') {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create Admin or Super Admin users'
        });
      }
    }

    // Check if trying to create Super Admin
    if (role === 'Super Admin') {
      if (!isCurrentUserSuperAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can create Super Admin users'
        });
      }

      const superAdminCount = await getSuperAdminCount();
      if (superAdminCount >= SUPER_ADMIN_LIMIT) {
        return res.status(400).json({
          success: false,
          message: `Cannot create more than ${SUPER_ADMIN_LIMIT} Super Admins`
        });
      }
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const initialPassword = generateStrongPassword();
    console.log(`Generated initial password for ${email}: ${initialPassword}`);

    const newUser = await User.create({
      name,
      email,
      phone,
      role,
      address,
      password: initialPassword,
      status: 'Active',
      twoFA: false,
      is_super_admin: role === 'Super Admin'
    });

    try {
      await sendInitialPasswordEmail(email, name, initialPassword);
    } catch (err) {
      console.error('Error sending initial password email:', err);
    }

    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      user: userResponse,
      message: 'User created successfully.'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    next(error);
  }
};

// Update user details (role assignment/fixes for super admin)
exports.updateUser = async (req, res, next) => {
  try {
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { id } = req.params;
    const { phone, role, address } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Phone and address are required'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = req.user;

    // Non-super-admin and non-admin cannot edit other users at all
    const currentIsSuperAdmin = isCurrentUserSuperAdmin(req);
    const currentIsAdmin = isCurrentUserAdmin(req);
    const editingSelf = currentUser && currentUser.id.toString() === id.toString();

    if (!currentIsSuperAdmin && !currentIsAdmin && !editingSelf) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this user'
      });
    }

    // Check if target is Super Admin
    const isTargetSuperAdmin = user.role === 'Super Admin' && user.is_super_admin;

    // Admins cannot edit Super Admins or Admins
    if (currentIsAdmin) {
      if (isTargetSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You cannot edit a Super Admin user'
        });
      }
      if (user.role === 'Admin') {
        // Admin cannot edit other Admin users
        if (!editingSelf) {
          return res.status(403).json({
            success: false,
            message: 'You cannot edit Admin users'
          });
        }
      }
    }

    // Prevent users from editing their own role
    if (editingSelf && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Determine if role change is requested and capture original role
    const originalRole = user.role;
    const wantsRoleChange = typeof role !== 'undefined' && role !== null && role !== originalRole;

    // Handle role changes
    if (wantsRoleChange) {
      // Only Super Admin can assign Admin or Super Admin roles
      if (role === 'Admin' || role === 'Super Admin') {
        if (!currentIsSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Only Super Admins can assign Admin or Super Admin roles'
          });
        }
      }

      // Changing TO Super Admin
      if (role === 'Super Admin') {
        const superAdminCount = await getSuperAdminCount();
        // If target is not already a super admin, check limit
        if (!isTargetSuperAdmin && superAdminCount >= SUPER_ADMIN_LIMIT) {
          return res.status(400).json({
            success: false,
            message: `Cannot have more than ${SUPER_ADMIN_LIMIT} Super Admins`
          });
        }
        user.is_super_admin = true;
      }

      // Changing FROM Super Admin
      if (originalRole === 'Super Admin' && role !== 'Super Admin') {
        // Only super admin can demote a super admin
        if (!currentIsSuperAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Only Super Admins can change Super Admin role'
          });
        }
        // Prevent self-role change from Super Admin
        if (editingSelf) {
          return res.status(400).json({
            success: false,
            message: 'You cannot change your own role from Super Admin'
          });
        }
        user.is_super_admin = false;
      }
    }

    // Update fields - Super Admins can edit other Super Admins' phone/address
    if (currentIsSuperAdmin || editingSelf || currentIsAdmin) {
      // Admins can edit phone/address of Editor/Readonly and themselves; already blocked editing other Admins above
      user.phone = phone;
      user.address = address;
    }

    // Update role if provided and allowed
    if (wantsRoleChange) {
      // Only allow role change if current user is Super Admin and not changing themselves
      if (currentIsSuperAdmin && !editingSelf) {
        user.role = role;
      } else if (currentIsAdmin && !editingSelf) {
        // Admins cannot change someone's role to Admin or Super Admin; they can change between Editor/Readonly only
        if (role === 'Admin' || role === 'Super Admin') {
          return res.status(403).json({
            success: false,
            message: 'Only Super Admins can assign Admin or Super Admin roles'
          });
        }
        // Target must not be Admin or Super Admin as administrators cannot change those
        if (user.role === 'Admin' || user.role === 'Super Admin') {
          return res.status(403).json({
            success: false,
            message: 'You cannot change roles of Admin or Super Admin users'
          });
        }
        user.role = role;
      } else if (editingSelf) {
        // already blocked earlier
      } else {
        // Not allowed
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to change roles'
        });
      }
    }

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse,
      message: wantsRoleChange
        ? 'User updated successfully. Role changed; the affected user may need to refresh or re-login to see permissions.'
        : 'User updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete a user (delete/demote logic for super admins)
exports.deleteUser = async (req, res, next) => {
  try {
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUser = req.user;

    // Check if current user has permission to delete
    const currentIsSuperAdmin = isCurrentUserSuperAdmin(req);
    const currentIsAdmin = isCurrentUserAdmin(req);

    // Check if user is Super Admin
    const isTargetSuperAdmin = user.role === 'Super Admin' && user.is_super_admin;

    if (isTargetSuperAdmin) {
      // Prevent deletion of Super Admin by non-Super Admins
      if (!currentIsSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You cannot delete a Super Admin user'
        });
      }

      // Prevent self-deletion for Super Admins
      if (currentUser.id.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Super Admin cannot delete their own account'
        });
      }
    }

    // If target is Admin
    if (user.role === 'Admin') {
      // Only Super Admin can delete Admin users
      if (!currentIsSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins can delete Admin users'
        });
      }

      // Prevent self-deletion for Admins as a general rule
      if (currentUser && currentUser.id.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }
    }

    // Prevent self-deletion for regular users
    if (currentUser && currentUser.id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Admins can delete only Editor or Readonly users
    if (currentIsAdmin) {
      if (!(user.role === 'Editor' || user.role === 'Readonly')) {
        return res.status(403).json({
          success: false,
          message: 'Admins can delete only Editor or Readonly users'
        });
      }
    }

    // Add deleted user's id to revokedTokens set (this prevents any further use of tokens for that user)
    exports.revokeToken(user.id.toString());

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUserId: id
    });
  } catch (error) {
    next(error);
  }
};

exports.isTokenRevoked = (userId) => {
  return revokedTokens.has(userId.toString());
};

// Revoke token for a user
exports.revokeToken = (userId) => {
  revokedTokens.add(userId.toString());
};

// Clear revoked token
exports.clearRevokedToken = (userId) => {
  revokedTokens.delete(userId.toString());
};

// Cleanup revoked tokens older than specified hours
exports.cleanupRevokedTokens = (hours = 24) => {
  console.log('Revoked tokens cleanup called (in-memory store persists until server restart)');
};

// Get current user info with fresh data
exports.getCurrentUser = async (req, res, next) => {
  try {
    if (exports.isTokenRevoked(req.user.id.toString())) {
      return res.status(401).json({
        success: false,
        message: 'Token revoked. User account no longer exists.'
      });
    }

    // Get fresh user data from database
    const freshUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user status is active
    if (freshUser.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact your administrator.'
      });
    }

    const userResponse = freshUser.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    next(error);
  }
};