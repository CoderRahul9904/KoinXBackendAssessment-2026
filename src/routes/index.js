const router = require('express').Router();
const { triggerReconcile } = require('../controllers/reconcileController');
const { getSummary, streamReportCsv } = require('../controllers/reportController');

router.post('/reconcile', triggerReconcile);
router.get('/reconcile/:runId', getSummary);
router.get('/report/:runId', streamReportCsv);
router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
