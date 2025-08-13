const auth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'נדרשת התחברות למערכת' 
    });
  }
  
  req.user = req.session.user;
  next();
};

module.exports = auth;
