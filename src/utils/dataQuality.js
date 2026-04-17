const ASSET_ALIASES = {
  'BITCOIN': 'BTC',
  'ETHEREUM': 'ETH',
  'SOLANA': 'SOL',
  'DOGECOIN': 'DOGE',
  'CARDANO': 'ADA',
};

const normalizeAsset = (asset) => {
  if (!asset) return null;
  let normalized = asset.toString().toUpperCase().trim();
  if (ASSET_ALIASES[normalized]) {
    return ASSET_ALIASES[normalized];
  }
  return normalized;
};

const normalizeType = (type) => {
  if (!type) return null;
  let normalized = type.toString().toUpperCase().trim();
  if (normalized === 'TRANSFER IN') return 'TRANSFER_IN';
  if (normalized === 'TRANSFER OUT') return 'TRANSFER_OUT';
  return normalized;
};

const validateRow = (row, source) => {
  let issues = [];
  
  if (!row.timestamp || isNaN(Date.parse(row.timestamp))) {
    issues.push("missing or invalid timestamp");
  } else if (new Date(row.timestamp) > new Date()) {
    issues.push("future_timestamp_detected");
  }
  
  const quantity = parseFloat(row.quantity);
  if (!row.quantity || isNaN(quantity) || quantity < 0) {
    issues.push("invalid quantity");
  }
  
  if (!row.asset || row.asset.trim() === '') {
    issues.push("missing asset");
  }
  
  if (!row.type || row.type.trim() === '') {
    issues.push("missing type");
  }
  
  if (!row.txId || row.txId.trim() === '') {
    issues.push("missing txId");
  }
  
  const criticalIssues = issues.filter(issue => issue !== "missing txId");
  const isValid = criticalIssues.length === 0;

  return { isValid, issues };
};

module.exports = { validateRow, normalizeAsset, normalizeType };
