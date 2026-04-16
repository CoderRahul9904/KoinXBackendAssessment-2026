const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    source: { type: String, required: true }, // e.g. 'bank', 'internal_system'
    status: { type: String, default: 'pending' }, // 'pending', 'matched', 'unmatched'
    runId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconciliationRun' }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
