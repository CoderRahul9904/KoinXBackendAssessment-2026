const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  runId: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange'] 
  },
  reason: { 
    type: String 
  },
  userTx: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  exchangeTx: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  conflictDetails: { 
    type: mongoose.Schema.Types.Mixed 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Report', reportSchema);
