const fs = require('fs');
const path = require('path');
const ReconciliationRun = require('../models/ReconciliationRun');
const Report = require('../models/Report');
const logger = require('../utils/logger');

async function getSummary(req, res) {
  try {
    const { runId } = req.params;
    const run = await ReconciliationRun.findOne({ runId }).lean();
    if (!run) return res.status(404).json({ error: 'runId not found' });
    
    res.json({
      runId: run.runId,
      status: run.status,
      summary: run.summary,
      completedAt: run.completedAt,
      error: run.error
    });
  } catch (error) {
    logger.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function streamReportCsv(req, res) {
  try {
    const { runId } = req.params;
    const csvPath = path.join(__dirname, `../../reports/reconciliation_${runId}.csv`);
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Report not found or not yet generated' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation_${runId}.csv"`);
    
    const readStream = fs.createReadStream(csvPath);
    readStream.pipe(res);
  } catch (error) {
    logger.error('Error streaming report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUnmatched(req, res) {
  try {
    const { runId } = req.params;
    const unmatched = await Report.find({
      runId,
      category: { $in: ['Unmatched_User', 'Unmatched_Exchange', 'unmatched_user', 'unmatched_exchange'] }
    }).lean();
    res.json(unmatched);
  } catch (error) {
    logger.error('Error fetching unmatched reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getSummary, streamReportCsv, getUnmatched };
