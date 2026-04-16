const fs = require('fs');
const csv = require('csv-parser');
const Transaction = require('../models/Transaction');
const { validateRow, normalizeAsset, normalizeType } = require('../utils/dataQuality');
const logger = require('../utils/logger');

const ingestCSV = (filePath, source, runId) => {
  return new Promise((resolve, reject) => {
    const transactions = [];
    let total = 0;
    let valid = 0;
    let flagged = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        total++;
        
        const timestampVal = row.timestamp ? new Date(row.timestamp) : null;
        const normalizedAsset = normalizeAsset(row.asset);
        const normalizedType = normalizeType(row.type);
        const quantityVal = parseFloat(row.quantity);
        const priceVal = row.price_usd ? parseFloat(row.price_usd) : (row.price ? parseFloat(row.price) : null);
        const feeVal = row.fee ? parseFloat(row.fee) : null;

        row.txId = row.transaction_id || row.txId; // For validateRow which checks txId

        const validation = validateRow(row, source);
        
        if (validation.isValid) valid++;
        else flagged++;

        transactions.push({
            source: source,
            txId: row.txId || null,
            timestamp: (timestampVal && !isNaN(timestampVal.getTime())) ? timestampVal : null,
            asset: normalizedAsset,
            type: normalizedType,
            quantity: isNaN(quantityVal) ? null : quantityVal,
            price: isNaN(priceVal) ? null : priceVal,
            fee: isNaN(feeVal) ? null : feeVal,
            currency: row.currency || 'USD',
            rawRow: row,
            dataQuality: validation,
            runId: runId
        });
      })
      .on('end', async () => {
        try {
          if (transactions.length > 0) {
            await Transaction.insertMany(transactions);
          }
          logger.info(`Ingestion complete for ${source}. Total: ${total}, Valid: ${valid}, Flagged: ${flagged}`);
          resolve({ total, valid, flagged });
        } catch (error) {
          logger.error(`Error saving transactions: ${error.message}`);
          reject(error);
        }
      })
      .on('error', (error) => reject(error));
  });
};

module.exports = { ingestCSV };
