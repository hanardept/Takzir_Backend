const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// Get all users (Admin only)
router.get('/', auth, rbac('admin'), async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      data: users 
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת המשתמשים' 
    });
  }
});

// Create new user (Admin only)
router.post('/', auth, rbac('admin'), [
  body('username').trim().isLength({ min: 3 }).withMessage('שם משתמש חייב להיות לפחות 3 תווים'),
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('role').isIn(['admin', 'technician', 'viewer']).withMessage('תפקיד לא תקין'),
  body('command').trim().notEmpty().withMessage('פיקוד הוא שדה חובה'),
  body('unit').trim().notEmpty().withMessage('יחידה היא שדה חובה')
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

    const { username, password, role, command, unit } = req.body;
    
    const user = new User({
      username: username.trim(),
      password,
      role,
      command: command.trim(),
      unit: unit.trim()
    });
    
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'משתמש נוצר בהצלחה',
      data: user.toJSON()
    });
    
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'שם משתמש כבר קיים במערכת' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת המשתמש' 
    });
  }
});

// Update user (Admin only)
router.put('/:id', auth, rbac('admin'), [
  body('role').optional().isIn(['admin', 'technician', 'viewer']).withMessage('תפקיד לא תקין'),
  body('command').optional().trim().notEmpty().withMessage('פיקוד לא יכול להיות רק'),
  body('unit').optional().trim().notEmpty().withMessage('יחידה לא יכולה להיות ריקה'),
  body('password').optional().isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים')
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
    
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: 'משתמש לא נמצא' 
      });
    }
    
    const allowedUpdates = ['role', 'command', 'unit', 'password'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'משתמש עודכן בהצלחה',
      data: user.toJSON()
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בעדכון המשתמש' 
    });
  }
});

// Soft delete user (Admin only)
router.delete('/:id', auth, rbac('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: 'משתמש לא נמצא' 
      });
    }
    
    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'לא ניתן למחוק את המנהל האחרון במערכת' 
        });
      }
    }
    
    user.isActive = false;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'משתמש נמחק בהצלחה' 
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה במחיקת המשתמש' 
    });
  }
});

module.exports = router;
