const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema({
  runId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'failed'] 
  },
  config: {
    timestampToleranceSeconds: { type: Number },
    quantityTolerancePct: { type: Number }
  },
  summary: {
    matched: { type: Number },
    conflicting: { type: Number },
    unmatched_user: { type: Number },
    unmatched_exchange: { type: Number }
  },
  startedAt: { 
    type: Date 
  },
  completedAt: { 
    type: Date 
  },
  error: { 
    type: String, 
    default: null 
  }
});

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
