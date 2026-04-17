const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const logger = require('../utils/logger');

function buildCsvRow(category, item) {
  let mappedCategory = '';
  let reason = '';
  
  if (category === 'matched') {
    mappedCategory = 'Matched';
    reason = 'Exact or within tolerance match';
  } else if (category === 'conflicting') {
    mappedCategory = 'Conflicting';
    reason = 'Potential match but fields differ beyond tolerance';
  } else if (category === 'unmatched_user') {
    mappedCategory = 'Unmatched_User';
    reason = 'Found in user side only';
  } else if (category === 'unmatched_exchange') {
    mappedCategory = 'Unmatched_Exchange';
    reason = 'Found in exchange side only';
  }

  const isUserUnmatched = category === 'unmatched_user';
  const isExchangeUnmatched = category === 'unmatched_exchange';
  
  const u = isExchangeUnmatched ? {} : (item.userTx || item || {});
  const e = isUserUnmatched ? {} : (item.exchangeTx || item || {});
  
  const safeStr = val => val == null ? '' : `"${String(val).replace(/"/g, '""')}"`;

  return [
    mappedCategory,
    safeStr(reason),
    // User fields
    safeStr(u.txId),
    safeStr(u.asset),
    safeStr(u.quantity),
    safeStr(u.price),
    safeStr(u.fee),
    safeStr(u.timestamp ? new Date(u.timestamp).toISOString() : ''),
    safeStr(u.type),
    // Exchange fields
    safeStr(e.txId),
    safeStr(e.asset),
    safeStr(e.quantity),
    safeStr(e.price),
    safeStr(e.fee),
    safeStr(e.timestamp ? new Date(e.timestamp).toISOString() : ''),
    safeStr(e.type)
  ].join(',');
}

async function generateReport(runId, matchResults) {
  try {
    logger.info(`Generating report for runId: ${runId}`);
    
    const reportsToInsert = [];
    let csvContent = "";
    
    // Headers
    csvContent += "category,reason,user_txId,user_asset,user_quantity,user_price,user_fee,user_timestamp,user_type,exchange_txId,exchange_asset,exchange_quantity,exchange_price,exchange_fee,exchange_timestamp,exchange_type\n";
    
    const categories = [
      { name: 'matched', data: matchResults.matched },
      { name: 'conflicting', data: matchResults.conflicting },
      { name: 'unmatched_user', data: matchResults.unmatched_user },
      { name: 'unmatched_exchange', data: matchResults.unmatched_exchange }
    ];
    
    for (const cat of categories) {
      for (const item of cat.data) {
        let reason = cat.name;
        if (cat.name === 'matched') reason = 'Perfect match';
        else if (cat.name === 'conflicting') reason = 'Conflict in match criteria';
        else if (cat.name === 'unmatched_user') reason = 'Missing from exchange';
        else if (cat.name === 'unmatched_exchange') reason = 'Missing from user';

        // Build DB report obj
        const reportObj = {
          runId,
          category: cat.name,
          reason: reason,
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
      unmatched_user: matchResults.unmatched_user.length,
      unmatched_exchange: matchResults.unmatched_exchange.length
    };
    
    return summary;
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    throw error;
  }
}

module.exports = { generateReport };
