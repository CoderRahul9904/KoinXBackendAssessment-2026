const router = require('express').Router();
const { triggerReconcile } = require('../controllers/reconcileController');
const { getSummary, streamReportCsv, getUnmatched } = require('../controllers/reportController');

router.post('/reconcile', triggerReconcile);
router.get('/report/:runId', streamReportCsv);
router.get('/report/:runId/summary', getSummary);
router.get('/report/:runId/unmatched', getUnmatched);

module.exports = router;
