const ReconciliationRun = require('../models/ReconciliationRun');
const ingestionService = require('../services/ingestion');
const matcherService = require('../services/matcher');
const reporterService = require('../services/reporter');
const path = require('path');
const logger = require('../utils/logger');

const runReconciliation = async (req, res) => {
    logger.info('Starting reconciliation run');
    const run = new ReconciliationRun();
    await run.save();
    
    try {
        // Assuming CSVs are available in data folder
        const bankFile = path.join(__dirname, '../../data/bank.csv');
        const internalFile = path.join(__dirname, '../../data/internal.csv');
        
        let count = 0;
        count += await ingestionService.ingestCSV(bankFile, 'bank', run._id);
        count += await ingestionService.ingestCSV(internalFile, 'internal_system', run._id);
        
        run.processedCount = count;
        
        // Match transactions
        await matcherService.matchTransactions(run._id);
        
        // Generate Report
        await reporterService.generateReport(run._id);
        
        run.status = 'completed';
        run.endTime = Date.now();
        await run.save();
        
        logger.info(`Reconciliation run ${run._id} completed successfully.`);
        res.status(200).json({ message: 'Reconciliation completed', runId: run._id });
        
    } catch (error) {
        logger.error(`Error in reconciliation: ${error.message}`);
        run.status = 'failed';
        run.endTime = Date.now();
        await run.save();
        res.status(500).json({ error: 'Reconciliation failed', details: error.message });
    }
};

module.exports = { runReconciliation };
