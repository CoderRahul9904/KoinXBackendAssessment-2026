const express = require('express');
const router = express.Router();
const reconcileController = require('../controllers/reconcileController');

router.post('/reconcile/ingest', reconcileController.ingestFiles);

module.exports = router;
