const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconciliationRun', required: true },
    totalMatched: { type: Number, default: 0 },
    totalUnmatched: { type: Number, default: 0 },
    discrepancies: [{
        transactionId: String,
        reason: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
