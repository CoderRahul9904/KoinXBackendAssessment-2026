# KoinX Reconciliation Engine

A robust Transaction Reconciliation Engine built in Node.js, Express, and MongoDB. This service ingests two CSV files (user transactions and exchange transactions), matches them using configurable tolerances, and produces a structured reconciliation report via REST APIs.

## Project Overview

In the cryptocurrency ecosystem, user balances on internal platforms must frequently be reconciled with their corresponding exchange balances. This engine automates that process by ingesting transaction data, mapping identical or corresponding asset types (e.g., BTC to Bitcoin), and matching entries based on acceptable time and amount tolerances.

## Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB** (with **Mongoose** standard ORM)
- **CSV Parsing** (`csv-parser`)
- **Multer** (for handling multipart/form-data CSV uploads)

## Prerequisites
- **Node.js** (v18+)
- **MongoDB** (local installation or MongoDB Atlas cluster)
- **npm** (Node Package Manager)

## Environment Variables

Create a `.env` file in the root directory and ensure the following variables are set:

```env
MONGODB_URI=mongodb://localhost:27017/koinx-reconciliation
PORT=3000
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
```

- `MONGODB_URI` - Connection string for MongoDB.
- `PORT` - Port the Express server will run on (Default: 3000).
- `TIMESTAMP_TOLERANCE_SECONDS` - The maximum allowable time difference in seconds between two matching transactions (Default: 300).
- `QUANTITY_TOLERANCE_PCT` - The maximum allowable percentage difference in transaction amounts between two matching transactions (Default: 0.01).

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd KoinXBackendAssessment-2026
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory (you can use `.env.example` as a template):
   ```bash
   cp .env.example .env
   ```
   *Make sure your MONGODB_URI points to a valid MongoDB instance.*

4. **Start the Application:**
   ```bash
   npm start
   ```
   *(For development mode with auto-reload, use `npm run dev` if configured).*

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/reconcile` | Triggers a reconciliation run. Accepts optional query/body parameters (`timestampToleranceSeconds`, `quantityTolerancePct`) and multipart file uploads (`userFile`, `exchangeFile`). |
| `GET` | `/report/:runId` | Retrieves the full reconciliation report for a specific run, including matched and unmatched transactions. |
| `GET` | `/report/:runId/summary` | Retrieves a summarized count of matches, conflicts, and unmatched transactions for a specific run. |
| `GET` | `/report/:runId/unmatched` | Retrieves a detailed list of unmatched transactions along with the reasons they failed to match. |

## Matching Logic & Key Decisions

- **Timestamp Tolerance**: Allows a time window buffer (`±N seconds`) to accommodate delays between system logging and actual blockchain/exchange execution. Configured globally but can be overridden per run.
- **Quantity Tolerance**: Amount discrepancies are matched using a percentage-based margin to account for fluctuating, minimal transaction fees across protocols.
- **Asset Aliasing**: Normalizes various asset naming conventions (e.g., matching "BTC" in one dataset to "Bitcoin" in the other) to prevent false negatives.
- **Type Mapping**: Correlates logical transaction inverses across different platforms (e.g., standardizing `TRANSFER_IN` to pair with `TRANSFER_OUT` in an exchange context).
- **Conflict vs Unmatched Resolution**: Transactions that find multiple matching criteria or exceed specific secondary thresholds are explicitly labeled as "Conflicting" rather than dropped. If no match is found, they are strictly "Unmatched".
- **Data Quality Enhancements**: Transactions with invalid timestamps or malformed amounts are flagged during the ingestion stage and explicitly reported. No data is silently dropped.

## Project Structure

```text
KoinXBackendAssessment-2026/
|-- data/
|-- reports/
|-- src/
|   |-- config/
|   |   |-- db.js
|   |   |-- tolerance.js
|   |-- controllers/
|   |   |-- reconcileController.js
|   |   |-- reportController.js
|   |-- models/
|   |   |-- ReconciliationRun.js
|   |   |-- Report.js
|   |   |-- Transaction.js
|   |-- routes/
|   |   |-- index.js
|   |-- services/
|   |   |-- ingestionService.js
|   |   |-- matcherService.js
|   |   |-- reporterService.js
|   |-- utils/
|       |-- dataQuality.js
|       |-- logger.js
|-- index.js
|-- package.json
|-- package-lock.json
|-- .env
|-- .env.example
|-- README.md
|-- render.yaml
```

## Deployment on Render

This project is configured for seamless deployment on [Render](https://render.com/). A standard `render.yaml` Blueprint is included in the project root to automate the required environment settings and continuous deployment process as a Web Service.
