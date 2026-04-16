// Export defaults, overridable by env vars or request body
module.exports = {
  timestampToleranceSeconds: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300,
  quantityTolerancePct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
};
