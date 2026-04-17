const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const logger = require('../utils/logger');

function getReason(category) {
  switch (category) {
    case 'matched': return 'Exact or tolerance match';
    case 'conflicting': return 'Close match but fields differ beyond tolerance';
    case 'unmatched_user': return 'No matching exchange transaction found';
    case 'unmatched_exchange': return 'No matching user transaction found';
    default: return '';
  }
}

function buildCsvRow(category, item) {
  const reason = getReason(category);
  const uTx = item.userTx || item || {};
  const eTx = item.exchangeTx || item || {};
  const isUserUnmatched = category === 'unmatched_user';
  const isExchangeUnmatched = category === 'unmatched_exchange';
  
  const u = isExchangeUnmatched ? {} : uTx;
  const e = isUserUnmatched ? {} : eTx;
  
  // Format fields to string safely
  const safeStr = val => val == null ? '' : String(val);
  const safeJson = val => val ? JSON.stringify(val).replace(/"/g, '""') : '';
  
  const conflictDetails = item.conflictDetails ? safeJson(item.conflictDetails) : '';

  return [
    category,
    reason,
    safeStr(u.txId),
    safeStr(u.timestamp),
    safeStr(u.asset),
    safeStr(u.type),
    safeStr(u.quantity),
    safeStr(u.price),
    safeStr(u.fee),
    safeStr(e.txId),
    safeStr(e.timestamp),
    safeStr(e.asset),
    safeStr(e.type),
    safeStr(e.quantity),
    safeStr(e.price),
    safeStr(e.fee),
    `"${conflictDetails}"`
  ].join(',');
}

async function generateReport(runId, matchResults) {
  try {
    logger.info(`Generating report for runId: ${runId}`);
    
    const reportsToInsert = [];
    let csvContent = "";
    
    // Headers
    csvContent += "category,reason,user_txId,user_timestamp,user_asset,user_type,user_quantity,user_price,user_fee,exchange_txId,exchange_timestamp,exchange_asset,exchange_type,exchange_quantity,exchange_price,exchange_fee,conflict_details\n";
    
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
          reason: getReason(cat.name),
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
    const csvPath = path.join(reportsDir, `${runId}.csv`);
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
