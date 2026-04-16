const mongoose = require('mongoose');

const reconciliationRunSchema = new mongoose.Schema({
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, default: 'processing' }, // processing, completed, failed
    processedCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('ReconciliationRun', reconciliationRunSchema);
