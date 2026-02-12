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

3) Open

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

# Database migrations

Create migration locally:

```bash
npx prisma migrate dev --name init
```
