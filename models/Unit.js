const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  commandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Command',
    required: true
  },
  commandName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'units'
});

// Compound unique index
unitSchema.index({ name: 1, commandId: 1 }, { unique: true });

module.exports = mongoose.model('Unit', unitSchema);
