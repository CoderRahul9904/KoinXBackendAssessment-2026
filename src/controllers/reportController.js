const Report = require('../models/Report');
const ReconciliationRun = require('../models/ReconciliationRun');
const logger = require('../utils/logger');

async function getFullReport(req, res) {
  try {
    const { runId } = req.params;
    const reports = await Report.find({ runId }).lean();
    if (!reports || reports.length === 0) {
      // Check if run exists
      const run = await ReconciliationRun.findOne({ runId });
      if (!run) return res.status(404).json({ error: 'runId not found' });
      return res.json([]);
    }
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching full report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

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

async function getUnmatched(req, res) {
  try {
    const { runId } = req.params;
    const unmatched = await Report.find({ 
      runId, 
      category: { $in: ['unmatched_user', 'unmatched_exchange'] } 
    }).lean();
    
    res.json(unmatched);
  } catch (error) {
    logger.error('Error fetching unmatched:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getFullReport, getSummary, getUnmatched };
