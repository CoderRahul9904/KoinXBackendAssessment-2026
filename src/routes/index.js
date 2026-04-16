const express = require('express');
const router = express.Router();
const reconcileController = require('../controllers/reconcileController');
const reportController = require('../controllers/reportController');

router.post('/reconcile', reconcileController.runReconciliation);
router.get('/reports/:runId', reportController.getReport);

module.exports = router;
