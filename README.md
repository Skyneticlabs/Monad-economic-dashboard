# Monad Economic Dashboard Backend 📈

Production-grade backend service that powers the **Monad — Economic & Fee Efficiency Dashboard**.  
It ingests on-chain signals (RPC sampling), builds network/fee/economics/usage analytics, stores time-series history, and serves a clean API for the dashboard UI.

---

## Highlights ✨

- 🔄 **Ingestion loop (poller)** with configurable interval
- 🗄️ **Time-series storage** in Postgres (Prisma)
- ⚡ **Snapshot KPI model** for instant dashboard loads
- 📊 **Timeseries endpoints** with window/step parameters
- 🧭 **API docs** via Swagger UI (`/docs`)
- ❤️ **Health & readiness** endpoints (`/health`, `/ready`)
- 🧹 **Retention policy** for historical data
- 🐳 Docker-first deployment with `docker-compose`

---

## Quickstart (Docker) 🐳

1) Create `.env` from example:

```bash
cp .env.example .env
```

2) Start services:

```bash
docker compose up --build
```

3) Open:
- API: `http://localhost:8080/api/v1/dashboard/snapshot`
- Docs: `http://localhost:8080/docs`
- Health: `http://localhost:8080/health`

---

## Local Development 🛠️

```bash
npm i
cp .env.example .env
npm run prisma:generate
npm run dev
```

### Database migrations

Create migration locally:

```bash
npx prisma migrate dev --name init
```

Deploy migrations in prod:

```bash
npm run prisma:migrate
```

### Seed the database 🌱

This fills the DB with realistic baseline metrics and a latest snapshot:

```bash
npm run db:seed
```

---

## API Overview 🔌

Base: `/api/v1`

- `GET /dashboard/snapshot`
- `GET /timeseries/network-load?window=24h&step=2h`
- `GET /timeseries/fees?window=24h&step=2h`
- `GET /timeseries/economics?window=24h&step=2h`
- `GET /timeseries/tx-composition?window=24h&step=2h`

---

## Timeseries Response Format

Timeseries endpoints return a normalized shape:

```json
{
  "window": "24h",
  "step": "2h",
  "labels": ["00:00", "02:00", "..."],
  "series": [
    { "key": "tx_per_block", "unit": "tx", "values": [2100, 2240, "..."] }
  ]
}
```

---

## Design Notes 🧠

- The ingestion pipeline is intentionally modular:
  - `collectors/` — RPC clients + normalization + collection logic
  - `jobs/` — polling loops + retention sweeps
  - `services/` — read APIs for UI (snapshot + series)

- The storage model is built for extension:
  - additional series keys, dimensions, rollups
  - future multi-network support (same schema, separate namespaces)
