# AGENTS.md — KoinX Transaction Reconciliation Engine
# Antigravity Step-by-Step Build Guide

> This file is the single source of truth for all agent tasks in this project.
> Work through each MISSION in order. Do NOT skip ahead.
> After each mission, verify outputs before proceeding to the next.

---

## PROJECT CONTEXT

Build a production-grade **Transaction Reconciliation Engine** in Node.js that:
- Ingests two CSV files (user transactions + exchange transactions) into MongoDB
- Matches transactions using configurable tolerance (timestamp, quantity, asset, type)
- Produces a structured reconciliation report (CSV + API)
- Exposes 4 REST API endpoints

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), csv-parser, dotenv, winston (logging)
**Style:** Clean code, layered architecture (Controller → Service → Repository), proper error handling

---

## FOLDER STRUCTURE (source of truth)

```
koinx-reconciliation/
├── src/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── tolerance.js           # Default tolerance config
│   ├── models/
│   │   ├── Transaction.js         # Mongoose schema for ingested rows
│   │   ├── ReconciliationRun.js   # Tracks each /reconcile call
│   │   └── Report.js             # Stores report rows per run
│   ├── services/
│   │   ├── ingestionService.js    # Parse CSV, flag bad rows, save to DB
│   │   ├── matcherService.js      # Core matching algorithm
│   │   └── reporterService.js     # Build and write report
│   ├── controllers/
│   │   ├── reconcileController.js
│   │   └── reportController.js
│   ├── routes/
│   │   └── index.js
│   └── utils/
│       ├── logger.js              # Winston logger
│       └── dataQuality.js        # Row validation helpers
├── data/
│   ├── user_transactions.csv
│   └── exchange_transactions.csv
├── reports/                       # Output CSV reports saved here
├── index.js                       # App entry point
├── .env.example
├── .env
└── README.md
```

---

## MISSION 1 — Project Scaffold ✅ (already running)

**Goal:** Initialize Node.js project, install dependencies, create folder structure.

**Dependencies to install:**
```
express mongoose csv-parser dotenv winston uuid
```

**Dev dependencies:**
```
nodemon
```

**package.json scripts:**
```json
"start": "node index.js",
"dev": "nodemon index.js"
```

**Verify before proceeding:**
- [ ] All folders exist as per structure above
- [ ] `node_modules` installed without errors
- [ ] `package.json` has correct scripts

---

## MISSION 2 — Environment Config + DB Connection

**Goal:** Set up `.env`, tolerance config, and MongoDB connection with proper error handling.

### 2A — Create `.env.example` and `.env`
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/koinx_reconciliation
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
```

### 2B — Create `src/config/db.js`
- Connect to MongoDB using `mongoose.connect(process.env.MONGO_URI)`
- Log success: `MongoDB connected: <host>`
- On error: log and `process.exit(1)`

### 2C — Create `src/config/tolerance.js`
```js
// Export defaults, overridable by env vars or request body
module.exports = {
  timestampToleranceSeconds: parseInt(process.env.TIMESTAMP_TOLERANCE_SECONDS) || 300,
  quantityTolerancePct: parseFloat(process.env.QUANTITY_TOLERANCE_PCT) || 0.01,
};
```

### 2D — Create `src/utils/logger.js`
- Use `winston` with Console transport
- Log levels: `info`, `warn`, `error`
- Format: `[TIMESTAMP] LEVEL: message`

### 2E — Create `index.js` entry point
```js
require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const routes = require('./src/routes/index');

const app = express();
app.use(express.json());
connectDB();
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Verify before proceeding:**
- [ ] `npm run dev` starts without crashing
- [ ] MongoDB connects (you should see the success log)

---

## MISSION 3 — Mongoose Schemas

**Goal:** Define 3 Mongoose models that capture all data needed for reconciliation.

### 3A — `src/models/Transaction.js`
Fields:
```
source         String  enum: ['user', 'exchange']  required
txId           String  (may be null — messy data)
timestamp      Date    (may be null — flag if so)
asset          String  uppercase normalized
type           String  uppercase normalized (BUY, SELL, TRANSFER_IN, TRANSFER_OUT, etc.)
quantity       Number
price          Number
fee            Number
currency       String
rawRow         Object  (store original CSV row as-is)
dataQuality    Object  {
                 isValid: Boolean,
                 issues: [String]   // e.g. ["missing timestamp", "invalid quantity"]
               }
runId          String  (UUID of the reconciliation run that ingested this)
createdAt      Date    default: Date.now
```

### 3B — `src/models/ReconciliationRun.js`
Fields:
```
runId          String  required unique
status         String  enum: ['pending', 'running', 'completed', 'failed']
config         Object  { timestampToleranceSeconds, quantityTolerancePct }
summary        Object  { matched: Number, conflicting: Number, unmatchedUser: Number, unmatchedExchange: Number }
startedAt      Date
completedAt    Date
error          String  (if failed)
```

### 3C — `src/models/Report.js`
Fields:
```
runId          String  required
category       String  enum: ['matched', 'conflicting', 'unmatched_user', 'unmatched_exchange']
reason         String  (human-readable explanation)
userTx         Object  (original user transaction row, null if N/A)
exchangeTx     Object  (original exchange transaction row, null if N/A)
conflictDetails Object (which fields differ and by how much)
createdAt      Date    default: Date.now
```

**Verify before proceeding:**
- [ ] All 3 model files exist with correct fields
- [ ] No Mongoose schema errors on server start

---

## MISSION 4 — Data Quality Utils + Ingestion Service

**Goal:** Parse CSVs, flag bad rows (never silently drop), save clean + flagged rows to MongoDB.

### 4A — Create `src/utils/dataQuality.js`

Write a `validateRow(row, source)` function that checks:
- `timestamp` is missing or unparseable → flag: `"missing or invalid timestamp"`
- `quantity` is missing, NaN, or negative → flag: `"invalid quantity"`
- `asset` is missing → flag: `"missing asset"`
- `type` is missing → flag: `"missing type"`
- `txId` is missing → flag: `"missing txId"` (warn only, not invalid)

Returns `{ isValid: boolean, issues: string[] }`

Also write:
- `normalizeAsset(asset)` → uppercase, map `"Bitcoin" → "BTC"`, `"Ethereum" → "ETH"`, `"Solana" → "SOL"`
- `normalizeType(type)` → uppercase trim

Asset alias map (at minimum):
```js
const ASSET_ALIASES = {
  'BITCOIN': 'BTC',
  'ETHEREUM': 'ETH',
  'SOLANA': 'SOL',
  'DOGECOIN': 'DOGE',
  'CARDANO': 'ADA',
};
```

### 4B — Create `src/services/ingestionService.js`

Write `ingestCSV(filePath, source, runId)`:
1. Read CSV using `csv-parser`
2. For each row:
   - Normalize asset and type
   - Run `validateRow()`
   - Build a `Transaction` document with `rawRow` = original row
   - Set `dataQuality` from validator result
   - Set `source` and `runId`
3. Bulk insert all rows (valid AND invalid) using `Transaction.insertMany()`
4. Log counts: total rows, valid rows, flagged rows
5. Return `{ total, valid, flagged }`

**Important:** Do NOT drop bad rows. Save them with `dataQuality.isValid = false`.

**Verify before proceeding:**
- [ ] Place sample CSVs in `/data/` folder
- [ ] Write a quick test call to `ingestCSV` in a temp script and confirm rows appear in MongoDB

---

## MISSION 5 — Matching Engine

**Goal:** Core algorithm that pairs user transactions with exchange transactions.

### 5A — Create `src/services/matcherService.js`

Write `matchTransactions(runId, config)`:

**Step 1: Load all transactions for this runId**
```js
const userTxs = await Transaction.find({ runId, source: 'user' });
const exchangeTxs = await Transaction.find({ runId, source: 'exchange' });
```

**Step 2: Matching logic**

For each user transaction, find the best matching exchange transaction using:

```
MATCH CRITERIA (all must pass):
1. asset matches (after normalization)
2. type matches OR is a known inverse pair:
   - TRANSFER_OUT (user) ↔ TRANSFER_IN (exchange)
   - TRANSFER_IN (user) ↔ TRANSFER_OUT (exchange)
3. timestamp within ± config.timestampToleranceSeconds
4. quantity within ± config.quantityTolerancePct percent
```

**Step 3: Categorization**

- If a pair passes all 4 criteria AND price/fee match within tolerance → **matched**
- If a pair matches on txId or proximity (timestamp + asset) but quantity/price/fee differ beyond tolerance → **conflicting**
  - Record `conflictDetails`: which fields differ and by how much (absolute + percentage)
- User transactions with no match → **unmatched_user**
- Exchange transactions with no match → **unmatched_exchange**

**Step 4: Return results**
```js
return {
  matched: [...],
  conflicting: [...],
  unmatched_user: [...],
  unmatched_exchange: [...],
};
```

**Algorithm note:** Use a greedy best-match approach. Sort candidates by timestamp proximity and pick the closest match. Mark matched exchange transactions so they can't be reused.

**Verify before proceeding:**
- [ ] Function runs without crashing on sample data
- [ ] Returns all 4 arrays (even if some are empty)

---

## MISSION 6 — Reporter Service

**Goal:** Save report rows to MongoDB and write a CSV output file.

### 6A — Create `src/services/reporterService.js`

Write `generateReport(runId, matchResults)`:

1. For each category in `matchResults`, create `Report` documents and bulk insert
2. Build summary counts: `{ matched, conflicting, unmatchedUser, unmatchedExchange }`
3. Write a CSV file to `reports/<runId>.csv` with columns:
   ```
   category, reason, user_txId, user_timestamp, user_asset, user_type, user_quantity, user_price, user_fee,
   exchange_txId, exchange_timestamp, exchange_asset, exchange_type, exchange_quantity, exchange_price, exchange_fee,
   conflict_details
   ```
4. Return summary

**Verify before proceeding:**
- [ ] Report documents appear in MongoDB after a run
- [ ] CSV file is created in `/reports/` folder

---

## MISSION 7 — REST API (Controllers + Routes)

**Goal:** Wire up all 4 required endpoints.

### 7A — Create `src/controllers/reconcileController.js`

**POST `/api/reconcile`**
```
Body (optional): { timestampToleranceSeconds, quantityTolerancePct }

Flow:
1. Generate runId using uuid()
2. Create ReconciliationRun with status: 'pending'
3. Respond immediately with { runId, status: 'pending' }
4. In background (async, non-blocking):
   a. Update run status to 'running'
   b. Call ingestCSV for both CSV files
   c. Call matchTransactions(runId, config)
   d. Call generateReport(runId, matchResults)
   e. Update run with status: 'completed', summary, completedAt
   f. On any error: update run status to 'failed', log error
```

### 7B — Create `src/controllers/reportController.js`

**GET `/api/report/:runId`**
- Fetch all Report documents for runId
- Return as JSON array
- 404 if runId not found

**GET `/api/report/:runId/summary`**
- Fetch ReconciliationRun by runId
- Return only `{ runId, status, summary, completedAt }`
- 404 if not found

**GET `/api/report/:runId/unmatched`**
- Fetch Report documents where category IN ['unmatched_user', 'unmatched_exchange']
- Include `reason` in each row
- Return as JSON array

### 7C — Create `src/routes/index.js`
```js
const router = require('express').Router();
const { triggerReconcile } = require('../controllers/reconcileController');
const { getFullReport, getSummary, getUnmatched } = require('../controllers/reportController');

router.post('/reconcile', triggerReconcile);
router.get('/report/:runId', getFullReport);
router.get('/report/:runId/summary', getSummary);
router.get('/report/:runId/unmatched', getUnmatched);

module.exports = router;
```

**Verify before proceeding:**
- [ ] `POST /api/reconcile` returns `{ runId, status: 'pending' }` immediately
- [ ] After ~10 seconds, `GET /api/report/:runId/summary` shows `status: 'completed'`
- [ ] All 4 endpoints return correct data

---

## MISSION 8 — README + Final Polish

**Goal:** Write a production-quality README and clean up code.

### README.md must include:

1. **Project Overview** — what the engine does
2. **Setup Instructions**
   ```
   git clone ...
   npm install
   cp .env.example .env   # fill in MONGO_URI
   Place CSVs in /data/
   npm run dev
   ```
3. **API Reference** — table of all 4 endpoints with example request/response
4. **Configuration** — explain `TIMESTAMP_TOLERANCE_SECONDS`, `QUANTITY_TOLERANCE_PCT`
5. **Key Design Decisions** (required by assignment):
   - Why greedy best-match over exhaustive matching
   - How TRANSFER_IN/OUT inversion is handled
   - Why bad rows are flagged not dropped
   - Async reconciliation (non-blocking POST /reconcile)
   - Asset normalization alias map

### Code polish checklist:
- [ ] No `console.log` — use `logger.js` everywhere
- [ ] All async functions have try/catch
- [ ] No hardcoded file paths — use `path.join(__dirname, ...)`
- [ ] `.env` is in `.gitignore`
- [ ] Consistent commit messages: `feat:`, `fix:`, `chore:`

---

## COMMIT STRATEGY

Make a commit after each mission completes:

```
feat: scaffold project structure and install dependencies       ← Mission 1
feat: add env config, db connection, and winston logger         ← Mission 2
feat: define Transaction, ReconciliationRun, Report schemas     ← Mission 3
feat: add data quality utils and CSV ingestion service          ← Mission 4
feat: implement core transaction matching engine                ← Mission 5
feat: add report generation service with CSV output            ← Mission 6
feat: wire up REST API endpoints and routes                    ← Mission 7
docs: write README with setup, API reference, design decisions ← Mission 8
```

---

## KNOWN DATA QUALITY ISSUES TO HANDLE

The CSVs are intentionally messy. The engine must handle:
- Missing `txId` values
- Timestamps in mixed formats (ISO 8601, Unix epoch, human-readable)
- Asset names written as full names (Bitcoin, Ethereum) instead of ticker
- TRANSFER_IN / TRANSFER_OUT perspective inversion
- Negative or zero quantities
- Missing fee or price columns
- Extra whitespace in column values
- Duplicate rows (same txId from same source)

---

## AGENT RULES

1. Always read this file before starting any mission
2. Complete missions in order — do not jump ahead
3. After each mission, verify the checklist before moving on
4. Use `logger.js` for all logging — never `console.log`
5. Never silently drop data — flag bad rows with a reason
6. Keep functions small and single-responsibility
7. If a requirement is ambiguous, implement the simpler interpretation and document the decision in README