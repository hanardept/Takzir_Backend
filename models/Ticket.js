const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: Number,
    // required: true,
    unique: true
  },
   subject: { 
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  command: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['רגילה', 'דחופה', 'מבצעית'],
    default: 'רגילה'
  },
  status: {
    type: String,
    required: true,
    enum: ['פתוח', 'בטיפול', 'תוקן'],
    default: 'פתוח'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 2000
  },
  openDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  closeDate: {
    type: Date,
    default: null
  },
  assignedTechnician: {
    type: String,
    default: null
  },
  comments: [commentSchema],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: String,
    required: true
  },
  lastModifiedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'tickets'
});

// Auto-increment ticket number
ticketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      console.log('Auto-generating ticketNumber...')
      const lastTicket = await this.constructor.findOne().sort({ ticketNumber: -1 }).lean();
      
      let nextNumber = 1;
      if (lastTicket && lastTicket.ticketNumber) {
        nextNumber = lastTicket.ticketNumber + 1;
      }
      
      console.log('Generated ticketNumber:', nextNumber);
      this.ticketNumber = nextNumber;
      
    } catch (error) {
      console.error('Error generating ticketNumber:', error);
      return next(error);
    }
  }
  next();
});

// Update closeDate when status changes to 'תוקן'
ticketSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'תוקן' && !this.closeDate) {
      this.closeDate = new Date();
    } else if (this.status !== 'תוקן') {
      this.closeDate = null;
    }
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
