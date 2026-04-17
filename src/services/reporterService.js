const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const logger = require('../utils/logger');

function buildCsvRow(category, item) {
  const match_status = (category === 'matched') ? 'matched' : 'unmatched';
  
  const uTx = item.userTx || item || {};
  const eTx = item.exchangeTx || item || {};
  
  const isUserUnmatched = category === 'unmatched_user';
  const isExchangeUnmatched = category === 'unmatched_exchange';
  
  const u = isExchangeUnmatched ? {} : uTx;
  const e = isUserUnmatched ? {} : eTx;
  
  const safeStr = val => val == null ? '' : String(val);
  
  let variance = '';
  if (item.conflictDetails && item.conflictDetails.quantityPct !== undefined) {
    variance = item.conflictDetails.quantityPct * 100;
  } else if (category === 'matched') {
    variance = 0;
  }

  return [
    safeStr(u.txId),
    safeStr(e.txId),
    match_status,
    safeStr(variance)
  ].join(',');
}

async function generateReport(runId, matchResults) {
  try {
    logger.info(`Generating report for runId: ${runId}`);
    
    const reportsToInsert = [];
    let csvContent = "";
    
    // Headers
    csvContent += "user_txId,exchange_txId,match_status,variance\n";
    
    const categories = [
      { name: 'matched', data: matchResults.matched },
      { name: 'conflicting', data: matchResults.conflicting },
      { name: 'unmatched_user', data: matchResults.unmatched_user },
      { name: 'unmatched_exchange', data: matchResults.unmatched_exchange }
    ];
    
    for (const cat of categories) {
      for (const item of cat.data) {
        // Build DB report obj
        const reportObj = {
          runId,
          category: cat.name,
          reason: cat.name,
          userTx: cat.name === 'unmatched_exchange' ? null : (item.userTx || item),
          exchangeTx: cat.name === 'unmatched_user' ? null : (item.exchangeTx || item),
          conflictDetails: item.conflictDetails || null
        };
        reportsToInsert.push(reportObj);
        
        // Build CSV row
        csvContent += buildCsvRow(cat.name, item) + "\n";
      }
    }
    
    // 1. Bulk insert to MongoDB
    if (reportsToInsert.length > 0) {
      await Report.insertMany(reportsToInsert);
    }
    
    // 2. Write CSV
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const csvPath = path.join(reportsDir, `reconciliation_${runId}.csv`);
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    
    logger.info(`Report saved to ${csvPath} and MongoDB for runId: ${runId}`);
    
    // 3. Construct Summary
    const summary = {
      matched: matchResults.matched.length,
      conflicting: matchResults.conflicting.length,
      unmatchedUser: matchResults.unmatched_user.length,
      unmatchedExchange: matchResults.unmatched_exchange.length
    };
    
    return summary;
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    throw error;
  }
}

module.exports = { generateReport };
