const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  source: { 
    type: String, 
    enum: ['user', 'exchange'], 
    required: true 
  },
  txId: { 
    type: String, 
    default: null 
  },
  timestamp: { 
    type: Date, 
    default: null 
  },
  asset: { 
    type: String, 
    uppercase: true 
  },
  type: { 
    type: String, 
    uppercase: true 
  },
  quantity: { 
    type: Number 
  },
  price: { 
    type: Number 
  },
  fee: { 
    type: Number 
  },
  currency: { 
    type: String 
  },
  rawRow: { 
    type: mongoose.Schema.Types.Mixed 
  },
  dataQuality: {
    isValid: { type: Boolean },
    issues: [{ type: String }]
  },
  runId: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
