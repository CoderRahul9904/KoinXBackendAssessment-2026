const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

function typesMatch(userType, exchangeType) {
  if (!userType || !exchangeType) return false;
  if (userType === exchangeType) return true;
  if (userType === 'TRANSFER_OUT' && exchangeType === 'TRANSFER_IN') return true;
  if (userType === 'TRANSFER_IN' && exchangeType === 'TRANSFER_OUT') return true;
  return false;
}

function checkQty(uTx, eTx, pctTolerance) {
  if (uTx.quantity == null || eTx.quantity == null) return false;
  const uQ = Math.abs(uTx.quantity);
  const eQ = Math.abs(eTx.quantity);
  const maxQ = Math.max(uQ, eQ);
  if (maxQ === 0) return uQ === eQ;
  const diffPct = Math.abs(uQ - eQ) / maxQ;
  return diffPct <= pctTolerance;
}

function checkPriceFee(uTx, eTx) {
  const priceUser = uTx.price || 0;
  const priceEx = eTx.price || 0;
  const feeUser = uTx.fee || 0;
  const feeEx = eTx.fee || 0;
  
  // Using a small epsilon to account for floating point inaccuracies
  return Math.abs(priceUser - priceEx) <= 0.01 && Math.abs(feeUser - feeEx) <= 0.01;
}

function calculateDiffs(uTx, eTx) {
  const diffs = {};
  if (uTx.quantity != null && eTx.quantity != null) {
    const uQ = Math.abs(uTx.quantity);
    const eQ = Math.abs(eTx.quantity);
    diffs.quantityAbs = Math.abs(uQ - eQ);
    const maxQ = Math.max(uQ, eQ);
    diffs.quantityPct = maxQ > 0 ? diffs.quantityAbs / maxQ : 0;
  }
  
  const priceUser = uTx.price || 0;
  const priceEx = eTx.price || 0;
  diffs.priceAbs = Math.abs(priceUser - priceEx);
  
  const feeUser = uTx.fee || 0;
  const feeEx = eTx.fee || 0;
  diffs.feeAbs = Math.abs(feeUser - feeEx);
  
  return diffs;
}

async function matchTransactions(runId, config) {
  try {
    logger.info(`Starting transaction matching for runId: ${runId}`);
    
    // Load all transactions for this runId
    const userTxs = await Transaction.find({ runId, source: 'user' }).lean();
    const exchangeTxs = await Transaction.find({ runId, source: 'exchange' }).lean();
    
    const matched = [];
    const conflicting = [];
    const unmatched_user = [];
    const unmatched_exchange = [];
    
    const exchangeUsed = new Set();
    
    for (const uTx of userTxs) {
      // Find candidates that haven't been used, and match on asset & type
      const candidates = exchangeTxs.filter(eTx => {
        if (exchangeUsed.has(eTx._id.toString())) return false;
        if (!uTx.asset || !eTx.asset || uTx.asset !== eTx.asset) return false;
        if (!typesMatch(uTx.type, eTx.type)) return false;
        return true;
      });
      
      // Calculate time differences for candidates
      const uTime = uTx.timestamp ? new Date(uTx.timestamp).getTime() : null;
      candidates.forEach(c => {
        if (uTime && c.timestamp) {
          c._timeDiff = Math.abs(uTime - new Date(c.timestamp).getTime()) / 1000;
        } else {
          c._timeDiff = Infinity;
        }
      });
      
      // Sort candidates by time proximity
      candidates.sort((a, b) => a._timeDiff - b._timeDiff);
      
      let bestMatch = null;
      let isConflicting = false;
      
      // Check for exact txId match first
      const exactMatch = candidates.find(c => uTx.txId && c.txId && uTx.txId === c.txId);
      
      if (exactMatch) {
        bestMatch = exactMatch;
        const qtyOk = checkQty(uTx, bestMatch, config.quantityTolerancePct);
        const priceFeeOk = checkPriceFee(uTx, bestMatch);
        // If there's an exact txId match, it's either matched (if qty/price/fee align) or conflicting.
        // It always passes the 'proximity' requirement by virtue of matching txId!
        isConflicting = !(qtyOk && priceFeeOk);
      } else {
        // Try finding closest PERFECT match
        const perfectMatch = candidates.find(c => {
          const timeOk = c._timeDiff <= config.timestampToleranceSeconds;
          const qtyOk = checkQty(uTx, c, config.quantityTolerancePct);
          const priceFeeOk = checkPriceFee(uTx, c);
          return timeOk && qtyOk && priceFeeOk;
        });
        
        if (perfectMatch) {
          bestMatch = perfectMatch;
          isConflicting = false;
        } else {
          // If no perfect match, find the closest candidate within timestamp tolerance to be marked conflicting
          const conflictingMatch = candidates.find(c => c._timeDiff <= config.timestampToleranceSeconds);
          if (conflictingMatch) {
            bestMatch = conflictingMatch;
            isConflicting = true;
          }
        }
      }
      
      // Assign the best match or mark as unmatched
      if (bestMatch) {
        exchangeUsed.add(bestMatch._id.toString());
        if (isConflicting) {
          conflicting.push({
            userTx: uTx,
            exchangeTx: bestMatch,
            conflictDetails: calculateDiffs(uTx, bestMatch)
          });
        } else {
          matched.push({ userTx: uTx, exchangeTx: bestMatch });
        }
      } else {
        unmatched_user.push(uTx);
      }
    }
    
    // Any exchange transactions not added to exchangeUsed are unmatched
    for (const eTx of exchangeTxs) {
      if (!exchangeUsed.has(eTx._id.toString())) {
        unmatched_exchange.push(eTx);
      }
    }
    
    logger.info(`Matching completed. Matched: ${matched.length}, Conflicting: ${conflicting.length}, Unmatched Local: ${unmatched_user.length}, Unmatched Exchange: ${unmatched_exchange.length}`);
    
    return {
      matched,
      conflicting,
      unmatched_user,
      unmatched_exchange
    };
  } catch (error) {
    logger.error(`Error in matchTransactions: ${error.message}`);
    throw error;
  }
}

module.exports = { matchTransactions };
