const rbac = (requiredRole) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    const roleHierarchy = {
      'viewer': 1,
      'technician': 2,
      'admin': 3
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לביצוע פעולה זו' 
      });
    }
    
    next();
  };
};

const canAccessTicket = (req, res, next) => {
  const userRole = req.user.role;
  const userCommand = req.user.command;
  const userUnit = req.user.unit;
  
  // Admin can access all tickets
  if (userRole === 'admin') {
    return next();
  }
  
  // For other roles, check command/unit access
  // This will be implemented per route based on ticket data
  next();
};

module.exports = { rbac, canAccessTicket };
