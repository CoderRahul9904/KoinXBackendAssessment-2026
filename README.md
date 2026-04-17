# Transaction Reconciliation Engine

A production-grade Node.js engine for ingesting and reconciling user transactions against exchange transaction records.

## 1. Project Overview
This engine parses intentionally messy transaction data (CSV), flags structural anomalies, and matches user transactions against exchange transactions utilizing configurable tolerances. Designed with scalability in mind, the service provides async reconciliations via robust REST API endpoints.

## 2. Setup Instructions

```bash
git clone <repository_url>
cd KoinXBackendAssessment-2026

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Fill in MONGO_URI in .env

# Place CSVs in /data/ folder (user_transactions.csv, exchange_transactions.csv)
# Start the dev server
npm run dev
```

## 3. API Reference

| Endpoint | Method | Description | Example Request / Response |
|----------|--------|-------------|----------------------------|
| `/api/reconcile` | `POST` | Triggers background reconciliation | **Body:** `{ "timestampToleranceSeconds": 300, "quantityTolerancePct": 0.01 }` <br> **Response `202`:** `{ "runId": "...", "status": "pending" }` |
| `/api/report/:runId` | `GET` | Fetches the full JSON report for a run | **Response `200`:** `[ { "category": "matched", "reason": "...", "userTx": {}, "exchangeTx": {} }, ... ]` |
| `/api/report/:runId/summary` | `GET` | Fetches summary metrics | **Response `200`:** `{ "runId": "...", "status": "completed", "summary": { "matched": 10, "conflicting": 2, "unmatchedUser": 1, "unmatchedExchange": 0 }, "completedAt": "..." }` |
| `/api/report/:runId/unmatched` | `GET` | Fetches strictly unmatched items | **Response `200`:** `[ { "category": "unmatched_user", "reason": "No matching exchange transaction found", "userTx": {} }, ... ]` |

## 4. Configuration
Tolerances can be updated locally via the `.env` configuration file, or dynamically by passing them in the POST `/api/reconcile` JSON body.

- `TIMESTAMP_TOLERANCE_SECONDS`: The maximum time difference strictly permitted (in seconds) between user and exchange transactions. Default `300`.
- `QUANTITY_TOLERANCE_PCT`: The maximum percentage deviation strictly permitted between quantity sizes. Default `0.01` (1%).

## 5. Key Design Decisions

- **Greedy Best-Match vs Exhaustive Matching:** Implemented a greedy best-match strategy emphasizing temporal proximity over an exhaustive O(N^2) search. Sorting candidates by time drastically reduces matching complexity per user footprint, yielding scalable processing without requiring combinatorial overhead.
- **Handling Inverse Transaction Pairs:** System considers `TRANSFER_IN` as identical inverse to `TRANSFER_OUT` permitting matching continuity across varied directional records.
- **Flagging vs. Dropping Unclean Data:** Retaining and tracking invalid items maintains full reconciliation transparency. Defective rows are preserved within MongoDB marked with `{ isValid: false }` rather than silently purged.
- **Async Reconciliation Approach:** `POST /api/reconcile` follows fire-and-forget principles responding with `202 Accepted` permitting extended payload ingestion + computation over time without HTTP blocking.
- **Asset Alias Normalization Engine:** Resolving aliases (`Bitcoin` -> `BTC`) centralizes asset referencing dynamically allowing identical underlying token representations.
