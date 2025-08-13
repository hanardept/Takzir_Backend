const express = require('express');
const { body, validationResult } = require('express-validator');
const Command = require('../models/Command');
const Unit = require('../models/Unit');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// Get all commands
router.get('/', auth, async (req, res) => {
  try {
    const commands = await Command.find({ isActive: true })
      .sort({ name: 1 });
    
    res.json({ 
      success: true, 
      data: commands 
    });
    
  } catch (error) {
    console.error('Get commands error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הפיקודים' 
    });
  }
});

// Get units by command
router.get('/:commandId/units', auth, async (req, res) => {
  try {
    const units = await Unit.find({ 
      commandId: req.params.commandId, 
      isActive: true 
    }).sort({ name: 1 });
    
    res.json({ 
      success: true, 
      data: units 
    });
    
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת היחידות' 
    });
  }
});

// Create new command (Admin only)
router.post('/', auth, rbac('admin'), [
  body('name').trim().notEmpty().withMessage('שם פיקוד הוא שדה חובה'),
  body('description').optional().trim()
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

    const command = new Command({
      name: req.body.name.trim(),
      description: req.body.description?.trim() || ''
    });
    
    await command.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'פיקוד נוצר בהצלחה',
      data: command 
    });
    
  } catch (error) {
    console.error('Create command error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'פיקוד עם שם זה כבר קיים במערכת' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת הפיקוד' 
    });
  }
});

// Create new unit (Admin only)
router.post('/:commandId/units', auth, rbac('admin'), [
  body('name').trim().notEmpty().withMessage('שם יחידה הוא שדה חובה'),
  body('description').optional().trim()
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

    const command = await Command.findById(req.params.commandId);
    if (!command || !command.isActive) {
      return res.status(404).json({ 
        success: false, 
        message: 'פיקוד לא נמצא' 
      });
    }

    const unit = new Unit({
      name: req.body.name.trim(),
      commandId: req.params.commandId,
      commandName: command.name,
      description: req.body.description?.trim() || ''
    });
    
    await unit.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'יחידה נוצרה בהצלחה',
      data: unit 
    });
    
  } catch (error) {
    console.error('Create unit error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'יחידה עם שם זה כבר קיימת בפיקוד זה' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת היחידה' 
    });
  }
});

module.exports = router;
