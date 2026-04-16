const { randomUUID } = require('crypto');
const ingestionService = require('../services/ingestionService');
const path = require('path');
const logger = require('../utils/logger');

const ingestFiles = async (req, res) => {
    const runId = randomUUID();
    logger.info(`Starting CSV ingestion directly via test endpoint for runId: ${runId}`);
    
    try {
        const userFile = path.join(__dirname, '../../data/user_transactions.csv');
        const exchangeFile = path.join(__dirname, '../../data/exchange_transactions.csv');
        
        const userResult = await ingestionService.ingestCSV(userFile, 'user', runId);
        const exchangeResult = await ingestionService.ingestCSV(exchangeFile, 'exchange', runId);
        
        const totalImported = userResult.total + exchangeResult.total;
        const validRows = userResult.valid + exchangeResult.valid;
        const flaggedRows = userResult.flagged + exchangeResult.flagged;
        
        res.status(200).json({
            runId,
            totalImported,
            validRows,
            flaggedRows
        });
    } catch (error) {
        logger.error(`Ingestion failed: ${error.message}`);
        res.status(500).json({ error: 'Ingestion failed', details: error.message });
    }
};

module.exports = { ingestFiles };
