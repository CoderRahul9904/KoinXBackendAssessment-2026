const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ReconciliationRun = require('../models/ReconciliationRun');
const { ingestCSV } = require('../services/ingestionService');
const { matchTransactions } = require('../services/matcherService');
const { generateReport } = require('../services/reporterService');
const logger = require('../utils/logger');
const defaultConfig = require('../config/tolerance');

async function triggerReconcile(req, res) {
  const { timestampToleranceSeconds, quantityTolerancePct } = req.body;
  const config = {
    timestampToleranceSeconds: timestampToleranceSeconds !== undefined ? timestampToleranceSeconds : defaultConfig.timestampToleranceSeconds,
    quantityTolerancePct: quantityTolerancePct !== undefined ? quantityTolerancePct : defaultConfig.quantityTolerancePct
  };

  const runId = uuidv4();

  try {
    // 2. Create ReconciliationRun
    await ReconciliationRun.create({
      runId,
      status: 'pending',
      config,
      startedAt: new Date()
    });

    // 3. Respond immediately
    res.status(202).json({ runId, status: 'pending' });

    // 4. Background processing
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
    
    // File paths
    const userCsvPath = path.join(__dirname, '../../data/user_transactions.csv');
    const exchangeCsvPath = path.join(__dirname, '../../data/exchange_transactions.csv');
    
    // Ingest
    await ingestCSV(userCsvPath, 'user', runId);
    await ingestCSV(exchangeCsvPath, 'exchange', runId);
    
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
