const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Login
router.post('/login', [
  body('username').trim().isLength({ min: 3 }).withMessage('שם משתמש חייב להיות לפחות 3 תווים'),
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'נתונים לא תקינים',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    
    const user = await User.findOne({ 
      username: username.trim(),
      isActive: true 
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'שם משתמש או סיסמה שגויים' 
      });
    }
    
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'שם משתמש או סיסמה שגויים' 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Create session
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      command: user.command,
      unit: user.unit
    };
    
    res.json({ 
      success: true, 
      message: 'התחברות בוצעה בהצלחה',
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בהתחברות למערכת' 
    });
  }
});

// Logout
router.post('/logout', auth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'שגיאה ביציאה מהמערכת' 
      });
    }
    
    res.clearCookie('connect.sid');
    res.json({ 
      success: true, 
      message: 'יצאת מהמערכת בהצלחה' 
    });
  });
});

// Get current user
router.get('/me', auth, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

module.exports = router;
