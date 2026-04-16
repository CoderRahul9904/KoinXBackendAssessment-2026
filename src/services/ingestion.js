const fs = require('fs');
const csv = require('csv-parser');
const Transaction = require('../models/Transaction');

const ingestCSV = (filePath, source, runId) => {
    return new Promise((resolve, reject) => {
        const transactions = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Map the CSV columns to our schema. 
                // Assuming standard headers: transactionId, amount, date
                transactions.push({
                    transactionId: row.transactionId || row.id,
                    amount: parseFloat(row.amount),
                    date: new Date(row.date),
                    source: source,
                    runId: runId
                });
            })
            .on('end', async () => {
                try {
                    if (transactions.length > 0) {
                        await Transaction.insertMany(transactions);
                    }
                    resolve(transactions.length);
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (error) => reject(error));
    });
};

module.exports = { ingestCSV };
