module.exports = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.flat();
    
    // Super Admin selalu memiliki akses penuh ke seluruh fitur admin
    if (req.user && (req.user.role === 'super_admin' || req.user.role === 'superadmin')) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    next();
  };
};