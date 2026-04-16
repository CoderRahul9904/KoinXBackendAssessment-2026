const Transaction = require('../models/Transaction');
const { amountTolerance, dateToleranceDays } = require('../config/tolerance');

const matchTransactions = async (runId) => {
    // Basic matching logic: exact transactionId match or close amount/date match
    // For simplicity, let's just group by transactionId or find closest matches
    
    // Get all pending transactions for this run
    let transactions = await Transaction.find({ runId, status: 'pending' });
    
    let matchedCount = 0;
    
    // Group by transactionId to find internal/bank pairs
    const grouped = {};
    transactions.forEach(t => {
        if(!grouped[t.transactionId]) grouped[t.transactionId] = [];
        grouped[t.transactionId].push(t);
    });
    
    for (const [txId, group] of Object.entries(grouped)) {
        if (group.length >= 2) {
            // Find matches within the group (e.g. one from bank, one from internal)
            // Need to check amount tolerance
            const t1 = group[0];
            const t2 = group[1];
            
            const amountDiff = Math.abs(t1.amount - t2.amount);
            const dateDiff = Math.abs(t1.date - t2.date) / (1000 * 60 * 60 * 24);
            
            if (amountDiff <= amountTolerance && dateDiff <= dateToleranceDays) {
                t1.status = 'matched';
                t2.status = 'matched';
                await t1.save();
                await t2.save();
                matchedCount += 2;
            } else {
                t1.status = 'unmatched';
                t2.status = 'unmatched';
                await t1.save();
                await t2.save();
            }
        } else {
            // Only 1 record found, unmatched
            const t1 = group[0];
            t1.status = 'unmatched';
            await t1.save();
        }
    }
    
    return matchedCount;
};

module.exports = { matchTransactions };
