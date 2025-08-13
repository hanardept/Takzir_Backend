const XLSX = require('xlsx');
const moment = require('moment');

const generateExcel = async (tickets) => {
  try {
    // Prepare data for Excel
    const data = tickets.map(ticket => ({
      'מספר תקלה': ticket.ticketNumber,
      'פיקוד': ticket.command,
      'יחידה': ticket.unit,
      'עדיפות': ticket.priority,
      'סטטוס': ticket.status,
      'תקלה חוזרת?': ticket.isRecurring ? 'כן' : 'לא',
      'תיאור התקלה': ticket.description,
      'תאריך פתיחה': moment(ticket.openDate).format('DD/MM/YYYY HH:mm'),
      'תאריך סגירה': ticket.closeDate ? moment(ticket.closeDate).format('DD/MM/YYYY HH:mm') : '',
      'נוצר על ידי': ticket.createdBy,
      'טכנאי מטפל': ticket.assignedTechnician || '',
      'עודכן לאחרונה': ticket.lastModifiedBy || ''
    }));
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data, { 
      header: [
        'מספר תקלה',
        'פיקוד', 
        'יחידה',
        'עדיפות',
        'סטטוס',
        'תקלה חוזרת?',
        'תיאור התקלה',
        'תאריך פתיחה',
        'תאריך סגירה',
        'נוצר על ידי',
        'טכנאי מטפל',
        'עודכן לאחרונה'
      ]
    });
    
    // Set RTL reading order
    ws['!dir'] = 'rtl';
    
    // Auto-size columns
    const cols = [
      { wch: 10 }, // מספר תקלה
      { wch: 15 }, // פיקוד
      { wch: 20 }, // יחידה  
      { wch: 10 }, // עדיפות
      { wch: 10 }, // סטטוס
      { wch: 12 }, // תקלה חוזרת
      { wch: 50 }, // תיאור התקלה
      { wch: 18 }, // תאריך פתיחה
      { wch: 18 }, // תאריך סגירה
      { wch: 15 }, // נוצר על ידי
      { wch: 15 }, // טכנאי מטפל
      { wch: 15 }  // עודכן לאחרונה
    ];
    ws['!cols'] = cols;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'תקלות');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { 
      type: 'buffer', 
      bookType: 'xlsx',
      cellStyles: true 
    });
    
    return buffer;
    
  } catch (error) {
    console.error('Excel generation error:', error);
    throw error;
  }
};

module.exports = { generateExcel };
