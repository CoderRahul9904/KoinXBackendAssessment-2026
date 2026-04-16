const Report = require('../models/Report');

const getReport = async (req, res) => {
    try {
        const report = await Report.findOne({ runId: req.params.runId });
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve report' });
    }
};

module.exports = { getReport };
