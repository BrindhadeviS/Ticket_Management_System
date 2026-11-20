
const roleMiddleware = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toLowerCase();
    if (!req.user || !normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
};

export default roleMiddleware;
