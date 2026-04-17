const crypto = require('crypto');
const path = require('path');
const ReconciliationRun = require('../models/ReconciliationRun');
const { ingestCSV } = require('../services/ingestionService');
const { matchTransactions } = require('../services/matcherService');
const { generateReport } = require('../services/reporterService');
const logger = require('../utils/logger');

async function triggerReconcile(req, res) {
  // Use environment variables for config directly instead of expecting req.body
  const timestampToleranceSeconds = parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300;
  const quantityTolerancePct = parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01;
  const config = { timestampToleranceSeconds, quantityTolerancePct };

  const runId = crypto.randomUUID();

  try {
    // File paths
    const userCsvPath = path.join(__dirname, '../../data/user_transactions.csv');
    const exchangeCsvPath = path.join(__dirname, '../../data/exchange_transactions.csv');
    
    // Ingest synchronously
    const userIngest = await ingestCSV(userCsvPath, 'user', runId);
    const exchangeIngest = await ingestCSV(exchangeCsvPath, 'exchange', runId);
    
    const totalImported = (userIngest.total || 0) + (exchangeIngest.total || 0);
    const validRows = (userIngest.valid || 0) + (exchangeIngest.valid || 0);
    const flaggedRows = (userIngest.flagged || 0) + (exchangeIngest.flagged || 0);

    // Create ReconciliationRun
    await ReconciliationRun.create({
      runId,
      status: 'pending',
      config,
      startedAt: new Date()
    });

    // Respond immediately with the required telemetry
    res.status(202).json({ 
      runId, 
      totalImported, 
      validRows, 
      flaggedRows 
    });

    // Background processing for match + report
    processReconciliation(runId, config).catch(err => {
      logger.error(`Background processing failed for runId ${runId}: ${err.message}`);
    });
  } catch (error) {
    logger.error(`Error triggering reconcile: ${error.message}`);
    res.status(500).json({ error: 'Failed to trigger reconciliation' });
  }
}

async function processReconciliation(runId, config) {
  try {
    await ReconciliationRun.findOneAndUpdate({ runId }, { status: 'running' });
    
    // Match
    const matchResults = await matchTransactions(runId, config);
    
    // Report
    const summary = await generateReport(runId, matchResults);
    
    // Complete
    await ReconciliationRun.findOneAndUpdate({ runId }, {
      status: 'completed',
      summary,
      completedAt: new Date()
    });
    
    logger.info(`Run ${runId} completed successfully.`);
  } catch (error) {
    await ReconciliationRun.findOneAndUpdate({ runId }, {
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    });
  }
}

module.exports = { triggerReconcile };
