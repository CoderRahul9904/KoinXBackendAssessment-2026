const router = require('express').Router();
const { triggerReconcile } = require('../controllers/reconcileController');
const { getFullReport, getSummary, getUnmatched } = require('../controllers/reportController');

router.post('/v1/reconcile/ingest', triggerReconcile);
router.get('/v1/report/:runId', getFullReport);
router.get('/v1/report/:runId/summary', getSummary);
router.get('/v1/report/:runId/unmatched', getUnmatched);

module.exports = router;
