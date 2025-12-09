module.exports = function authorizeRoles(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // If user is a real Super Admin (flag + role), always allow
      if (user.role === 'Super Admin' && user.is_super_admin) {
        return next();
      }

      // allowedRoles is an array of role names (e.g. ['Admin','Editor'])
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (allowedRoles.includes(user.role)) {
          return next();
        }
        return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
      }

      // If no allowedRoles specified, allow any authenticated user
      return next();
    } catch (err) {
      console.error('authorizeRoles error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
};