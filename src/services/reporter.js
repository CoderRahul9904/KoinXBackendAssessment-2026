const Transaction = require('../models/Transaction');
const Report = require('../models/Report');

const generateReport = async (runId) => {
    const matched = await Transaction.countDocuments({ runId, status: 'matched' });
    const unmatched = await Transaction.find({ runId, status: 'unmatched' });
    
    const discrepancies = unmatched.map(t => ({
        transactionId: t.transactionId,
        reason: 'No matching counterpart found or values outside tolerance'
    }));
    
    const report = new Report({
        runId,
        totalMatched: matched,
        totalUnmatched: unmatched.length,
        discrepancies
    });
    
    await report.save();
    return report;
};

module.exports = { generateReport };
