const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');
const { rbac, canAccessTicket } = require('../middleware/rbac');
const { generateExcel } = require('../utils/excel');
const router = express.Router();

// Dashboard statistics endpoint
router.get('/stats', auth, async (req, res) => {
  try {
    // Build filter based on user role
    let filter = { isDeleted: false };
    
    if (req.user.role !== 'admin') {
      filter.command = req.user.command;
      if (req.user.role === 'viewer') {
        filter.unit = req.user.unit;
      }
    }
    
    // Get statistics using aggregation
    const stats = await Ticket.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          openTickets: { 
            $sum: { $cond: [{ $eq: ['$status', 'פתוח'] }, 1, 0] } 
          },
          inProgressTickets: { 
            $sum: { $cond: [{ $eq: ['$status', 'בטיפול'] }, 1, 0] } 
          },
          closedTickets: { 
            $sum: { $cond: [{ $eq: ['$status', 'תוקן'] }, 1, 0] } 
          },
          highPriorityTickets: { 
            $sum: { $cond: [{ $eq: ['$priority', 'מבצעית'] }, 1, 0] } 
          },
          recurringTickets: { 
            $sum: { $cond: [{ $eq: ['$isRecurring', true] }, 1, 0] } 
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      closedTickets: 0,
      highPriorityTickets: 0,
      recurringTickets: 0
    };

    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Get ticket stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת הסטטיסטיקות' 
    });
  }
});

// Dashboard recent tickets endpoint
router.get('/recent', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('מספר תוצאות לא תקין')
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Build filter based on user role
    let filter = { isDeleted: false };
    
    if (req.user.role !== 'admin') {
      filter.command = req.user.command;
      if (req.user.role === 'viewer') {
        filter.unit = req.user.unit;
      }
    }
    
    const recentTickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('ticketNumber command unit priority status description openDate isRecurring createdBy');
    
    res.json({
      success: true,
      data: recentTickets
    });
    
  } catch (error) {
    console.error('Get recent tickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת התקלות האחרונות' 
    });
  }
});

// Dashboard summary endpoint (combines stats and recent tickets)
router.get('/dashboard-summary', auth, async (req, res) => {
  try {
    // Build filter based on user role
    let filter = { isDeleted: false };
    
    if (req.user.role !== 'admin') {
      filter.command = req.user.command;
      if (req.user.role === 'viewer') {
        filter.unit = req.user.unit;
      }
    }
    
    // Get both stats and recent tickets in parallel
    const [stats, recentTickets] = await Promise.all([
      Ticket.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: { 
              $sum: { $cond: [{ $eq: ['$status', 'פתוח'] }, 1, 0] } 
            },
            inProgressTickets: { 
              $sum: { $cond: [{ $eq: ['$status', 'בטיפול'] }, 1, 0] } 
            },
            closedTickets: { 
              $sum: { $cond: [{ $eq: ['$status', 'תוקן'] }, 1, 0] } 
            },
            highPriorityTickets: { 
              $sum: { $cond: [{ $eq: ['$priority', 'מבצעית'] }, 1, 0] } 
            },
            recurringTickets: { 
              $sum: { $cond: [{ $eq: ['$isRecurring', true] }, 1, 0] } 
            }
          }
        }
      ]),
      Ticket.find(filter)
        .sort({ createdAt: -1 })
        .limit(10)
        .select('ticketNumber command unit priority status description openDate isRecurring createdBy')
    ]);

    const statsResult = stats[0] || {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      closedTickets: 0,
      highPriorityTickets: 0,
      recurringTickets: 0
    };

    res.json({
      success: true,
      data: {
        stats: statsResult,
        recentTickets
      }
    });
    
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת נתוני הדשבורד' 
    });
  }
});


// Get tickets with filtering and pagination
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('מספר עמוד לא תקין'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('מספר תוצאות לא תקין'),
  query('status').optional().isIn(['פתוח', 'בטיפול', 'תוקן']).withMessage('סטטוס לא תקין'),
  query('priority').optional().isIn(['רגילה', 'דחופה', 'מבצעית']).withMessage('עדיפות לא תקינה')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'נתוני חיפוש לא תקינים',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build filter based on user role and permissions
    let filter = { isDeleted: false };
    
    if (req.user.role !== 'admin') {
      filter.command = req.user.command;
      if (req.user.role === 'technician') {
        // Technicians can see all tickets from their command
      } else if (req.user.role === 'viewer') {
        // Viewers can only see tickets from their unit
        filter.unit = req.user.unit;
      }
    }
    
    // Apply query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.command) filter.command = new RegExp(req.query.command, 'i');
    if (req.query.unit) filter.unit = new RegExp(req.query.unit, 'i');
    if (req.query.ticketNumber) filter.ticketNumber = parseInt(req.query.ticketNumber);
    if (req.query.isRecurring) filter.isRecurring = req.query.isRecurring === 'true';
    
    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.openDate = {};
      if (req.query.dateFrom) filter.openDate.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.openDate.$lte = new Date(req.query.dateTo);
    }
    
    // Text search in description
    if (req.query.search) {
      filter.description = new RegExp(req.query.search, 'i');
    }
    
    // Get total count
    const total = await Ticket.countDocuments(filter);
    
    // Get tickets with sorting
    const sortBy = req.query.sortBy || 'ticketNumber';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    const tickets = await Ticket.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-comments'); // Exclude comments from list view
    
    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת התקלות' 
    });
  }
});

// Get single ticket by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'תקלה לא נמצאה' 
      });
    }
    
    // Check access permissions
    if (req.user.role !== 'admin') {
      if (req.user.command !== ticket.command) {
        return res.status(403).json({ 
          success: false, 
          message: 'אין הרשאה לצפייה בתקלה זו' 
        });
      }
      
      if (req.user.role === 'viewer' && req.user.unit !== ticket.unit) {
        return res.status(403).json({ 
          success: false, 
          message: 'אין הרשאה לצפייה בתקלה זו' 
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: ticket 
    });
    
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בטעינת התקלה' 
    });
  }
});

// Create new ticket
router.post('/', auth, rbac('technician'), [
  body('command').trim().notEmpty().withMessage('פיקוד הוא שדה חובה'),
  body('unit').trim().notEmpty().withMessage('יחידה היא שדה חובה'),
  body('priority').isIn(['רגילה', 'דחופה', 'מבצעית']).withMessage('עדיפות לא תקינה'),
  body('description').trim().isLength({ min: 5, max: 2000 }).withMessage('תיאור חייב להיות בין 5-2000 תווים'),
  body('isRecurring').optional().isBoolean().withMessage('תקלה חוזרת חייבת להיות כן/לא')
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
    
    const { command, unit, priority, description, isRecurring } = req.body;
    
    const ticket = new Ticket({
      command: command.trim(),
      unit: unit.trim(),
      priority,
      description: description.trim(),
      isRecurring: isRecurring || false,
      createdBy: req.user.username,
      openDate: new Date()
    });
    
    await ticket.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'תקלה נוצרה בהצלחה',
      data: ticket 
    });
    
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה ביצירת התקלה' 
    });
  }
});

// Update ticket
router.put('/:id', auth, rbac('technician'), [
  body('priority').optional().isIn(['רגילה', 'דחופה', 'מבצעית']).withMessage('עדיפות לא תקינה'),
  body('status').optional().isIn(['פתוח', 'בטיפול', 'תוקן']).withMessage('סטטוס לא תקין'),
  body('description').optional().trim().isLength({ min: 5, max: 2000 }).withMessage('תיאור חייב להיות בין 5-2000 תווים'),
  body('isRecurring').optional().isBoolean().withMessage('תקלה חוזרת חייבת להיות כן/לא')
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
    
    const ticket = await Ticket.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'תקלה לא נמצאה' 
      });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user.command !== ticket.command) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה לעדכון תקלה זו' 
      });
    }
    
    const allowedUpdates = ['priority', 'status', 'description', 'isRecurring', 'assignedTechnician'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    updates.lastModifiedBy = req.user.username;
    
    Object.assign(ticket, updates);
    await ticket.save();
    
    res.json({ 
      success: true, 
      message: 'תקלה עודכנה בהצלחה',
      data: ticket 
    });
    
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בעדכון התקלה' 
    });
  }
});

// Add comment to ticket
router.post('/:id/comments', auth, rbac('technician'), [
  body('content').trim().isLength({ min: 1, max: 500 }).withMessage('הערה חייבת להיות בין 1-500 תווים')
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
    
    const ticket = await Ticket.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'תקלה לא נמצאה' 
      });
    }
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user.command !== ticket.command) {
      return res.status(403).json({ 
        success: false, 
        message: 'אין הרשאה להוספת הערה לתקלה זו' 
      });
    }
    
    const comment = {
      author: req.user.username,
      content: req.body.content.trim(),
      createdAt: new Date()
    };
    
    ticket.comments.push(comment);
    ticket.lastModifiedBy = req.user.username;
    await ticket.save();
    
    res.json({ 
      success: true, 
      message: 'הערה נוספה בהצלחה',
      data: comment 
    });
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בהוספת הערה' 
    });
  }
});

// Soft delete ticket
router.delete('/:id', auth, rbac('admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ 
      _id: req.params.id, 
      isDeleted: false 
    });
    
    if (!ticket) {
      return res.status(404).json({ 
        success: false, 
        message: 'תקלה לא נמצאה' 
      });
    }
    
    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    ticket.lastModifiedBy = req.user.username;
    await ticket.save();
    
    res.json({ 
      success: true, 
      message: 'תקלה נמחקה בהצלחה' 
    });
    
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה במחיקת התקלה' 
    });
  }
});

// Export tickets to Excel
router.get('/export/excel', auth, async (req, res) => {
  try {
    // Build filter based on user role
    let filter = { isDeleted: false };
    
    if (req.user.role !== 'admin') {
      filter.command = req.user.command;
      if (req.user.role === 'viewer') {
        filter.unit = req.user.unit;
      }
    }
    
    // Apply query filters
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.command) filter.command = new RegExp(req.query.command, 'i');
    if (req.query.unit) filter.unit = new RegExp(req.query.unit, 'i');
    
    const tickets = await Ticket.find(filter)
      .sort({ ticketNumber: -1 })
      .limit(10000); // Limit for performance
    
    const buffer = await generateExcel(tickets);
    
    const filename = `tickets_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בייצוא לאקסל' 
    });
  }
});



module.exports = router;
