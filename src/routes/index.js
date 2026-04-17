const router = require('express').Router();
const { triggerReconcile } = require('../controllers/reconcileController');
const { getFullReport, getSummary, getUnmatched } = require('../controllers/reportController');

router.post('/reconcile', triggerReconcile);
router.get('/report/:runId', getFullReport);
router.get('/report/:runId/summary', getSummary);
router.get('/report/:runId/unmatched', getUnmatched);

module.exports = router;
