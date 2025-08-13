const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const router = express.Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('רק קבצי Excel (.xlsx, .xls) מותרים'));
    }
  }
});

// Import tickets from uploaded Excel file
router.post('/tickets', auth, rbac('admin'), upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'לא נמצא קובץ Excel'
      });
    }

    console.log('📁 File uploaded:', req.file.originalname);
    
    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Map Excel columns to ticket schema
        const ticketData = {
          ticketNumber: row['מספר תקלה'] || row['Ticket Number'] || generateTicketNumber(),
          command: row['פיקוד'] || row['Command'] || 'לא צוין',
          unit: row['יחידה'] || row['Unit'] || 'לא צוין',
          priority: mapPriority(row['עדיפות'] || row['Priority']),
          status: mapStatus(row['סטטוס'] || row['Status']),
          description: row['תיאור'] || row['Description'] || 'תיאור לא זמין',
          equipmentType: row['סוג ציוד'] || row['Equipment Type'] || 'לא צוין',
          equipmentModel: row['דגם ציוד'] || row['Equipment Model'] || '',
          isRecurring: parseBoolean(row['תקלה חוזרת'] || row['Recurring']),
          createdBy: req.user.username || 'import-system',
          openDate: parseDate(row['תאריך פתיחה'] || row['Open Date']),
          assignedTechnician: row['טכנאי אחראי'] || row['Assigned Tech'] || null,
          lastModifiedBy: req.user.username || 'import-system'
        };
        
        // Create and save ticket
        const ticket = new Ticket(ticketData);
        await ticket.save();
        importedCount++;
        
      } catch (error) {
        console.error(`❌ Error importing row ${i + 2}:`, error.message);
        errors.push(`שורה ${i + 2}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    console.log(`✅ Import completed: ${importedCount} success, ${errorCount} errors`);
    
    res.json({
      success: true,
      message: 'ייבוא הושלם בהצלחה',
      data: {
        totalRows: data.length,
        imported: importedCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10), // Show first 10 errors
        successRate: ((importedCount / data.length) * 100).toFixed(1)
      }
    });
    
  } catch (error) {
    console.error('Import route error:', error);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'שגיאה בייבוא הנתונים: ' + error.message
    });
  }
});

// Helper functions
function generateTicketNumber() {
  const prefix = 'TKT';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

function mapPriority(priority) {
  if (!priority) return 'רגילה';
  
  const priorityMap = {
    'low': 'רגילה', 'normal': 'רגילה', 'רגילה': 'רגילה', 'נמוכה': 'רגילה',
    'urgent': 'דחופה', 'high': 'דחופה', 'דחופה': 'דחופה', 'גבוהה': 'דחופה',
    'critical': 'מבצעית', 'קריטית': 'מבצעית', 'מבצעית': 'מבצעית'
  };
  
  return priorityMap[priority.toString().toLowerCase()] || 'רגילה';
}

function mapStatus(status) {
  if (!status) return 'פתוח';
  
  const statusMap = {
    'open': 'פתוח', 'new': 'פתוח', 'פתוח': 'פתוח', 'חדש': 'פתוח',
    'in progress': 'בטיפול', 'working': 'בטיפול', 'בטיפול': 'בטיפול',
    'closed': 'תוקן', 'resolved': 'תוקן', 'fixed': 'תוקן', 'תוקן': 'תוקן'
  };
  
  return statusMap[status.toString().toLowerCase()] || 'פתוח';
}

function parseBoolean(value) {
  if (!value) return false;
  const truthyValues = ['true', 'yes', 'כן', '1', 1, true, 'נכון'];
  return truthyValues.includes(value.toString().toLowerCase());
}

function parseDate(dateValue) {
  if (!dateValue) return new Date();
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? new Date() : date;
}

module.exports = router;
