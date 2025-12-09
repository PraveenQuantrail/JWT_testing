const User = require('../models/usersModels');
const { Op } = require('sequelize');
const SUPER_ADMIN_LIMIT = 3;

module.exports = async function userAccessControl(req, res, next) {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findByPk(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Attach target user so controller can reuse if desired
    req.targetUser = target;

    const editingSelf = currentUser && currentUser.id.toString() === id.toString();
    const currentIsSuperAdmin = currentUser.role === 'Super Admin' && currentUser.is_super_admin === true;
    const currentIsAdmin = currentUser.role === 'Admin' && !currentUser.is_super_admin;

    const targetIsSuperAdmin = target.role === 'Super Admin' && target.is_super_admin === true;
    const targetIsAdmin = target.role === 'Admin';

    // For DELETE: enforce deletion rules
    if (req.method === 'DELETE') {
      // Super Admin removal rules
      if (targetIsSuperAdmin) {
        if (!currentIsSuperAdmin) {
          return res.status(403).json({ success: false, message: 'You cannot delete a Super Admin user' });
        }
        if (editingSelf) {
          return res.status(400).json({ success: false, message: 'Super Admin cannot delete their own account' });
        }
      }

      // Admin deletion rules
      if (targetIsAdmin) {
        if (!currentIsSuperAdmin) {
          return res.status(403).json({ success: false, message: 'Only Super Admins can delete Admin users' });
        }
        if (editingSelf) {
          return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }
      }

      // Prevent self-deletion for everyone
      if (editingSelf) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      }

      // If current user is Admin (non-super), they can delete only Editor/Readonly
      if (currentIsAdmin) {
        if (!(target.role === 'Editor' || target.role === 'Readonly')) {
          return res.status(403).json({ success: false, message: 'Admins can delete only Editor or Readonly users' });
        }
      }

      return next();
    }

    // For PUT (update): enforce update rules regarding role changes and editing others
    if (req.method === 'PUT') {
      // Non-admin/non-super-admin cannot edit other users
      if (!currentIsSuperAdmin && !currentIsAdmin && !editingSelf) {
        return res.status(403).json({ success: false, message: 'You do not have permission to edit this user' });
      }

      // Admins cannot edit Super Admins
      if (currentIsAdmin && targetIsSuperAdmin) {
        return res.status(403).json({ success: false, message: 'You cannot edit a Super Admin user' });
      }

      // Admins cannot edit other Admins (except themselves)
      if (currentIsAdmin && targetIsAdmin && !editingSelf) {
        return res.status(403).json({ success: false, message: 'You cannot edit Admin users' });
      }

      // Prevent users from changing their own role
      if (editingSelf && typeof req.body.role !== 'undefined' && req.body.role !== target.role) {
        return res.status(400).json({ success: false, message: 'You cannot change your own role' });
      }

      // Handle role change authorization:
      const requestedRole = typeof req.body.role !== 'undefined' ? req.body.role : target.role;
      if (requestedRole === 'Admin' || requestedRole === 'Super Admin') {
        // only super admin can assign Admin or Super Admin
        if (!currentIsSuperAdmin) {
          return res.status(403).json({ success: false, message: 'Only Super Admins can assign Admin or Super Admin roles' });
        }
      }

      // Changing TO Super Admin: enforce limit
      if (requestedRole === 'Super Admin' && !(target.role === 'Super Admin' && target.is_super_admin)) {
        const count = await User.count({ where: { role: 'Super Admin', is_super_admin: true } });
        if (count >= SUPER_ADMIN_LIMIT) {
          return res.status(400).json({ success: false, message: `Cannot have more than ${SUPER_ADMIN_LIMIT} Super Admins` });
        }
      }

      // Changing FROM Super Admin: only Super Admin and cannot change themselves
      if (targetIsSuperAdmin && requestedRole !== 'Super Admin') {
        if (!currentIsSuperAdmin) {
          return res.status(403).json({ success: false, message: 'Only Super Admins can change Super Admin role' });
        }
        if (editingSelf) {
          return res.status(400).json({ success: false, message: 'You cannot change your own role from Super Admin' });
        }
      }
      return next();
    }

    return next();
  } catch (err) {
    console.error('userAccessControl middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};