# YOUR-PRINTS

> **Digital Footprint Intelligence**  
> *Evidence Before Inference*

YOUR-PRINTS is an open, evidence-based digital footprint intelligence platform. It maps, normalizes, correlates, and forensically presents publicly observable digital traces associated with an email address.

---

## Core Philosophy

- **Evidence Before Inference**: Every finding is backed by an immutable evidentiary chain of custody. A technical signal (e.g. an MX host or common username) is never conflated with personal human identity.
- **Provider Policy Adherence**: Zero proxy rotation, zero anti-bot evasion. The platform respects upstream rate limits, access controls, and robots policies.
- **No Stolen Credentials**: Zero storage or indexing of password dumps, cleartext secrets, or exploit data.
- **Privacy & Ephemerality**: Automated 48-hour data retention with immediate user-requested erasure and opt-out registry support.

---

## Project Structure

```
YOUR-PRINTS/
├── backend/               # FastAPI async modular monolith
│   ├── app/
│   │   ├── api/           # REST endpoints & middleware
│   │   ├── core/          # Configuration & security
│   │   ├── domain/        # Domain entities, schemas, confidence models
│   │   ├── engine/        # Orchestration, normalization, correlation
│   │   └── providers/     # Isolated external collector adapters
│   └── tests/             # Unit & integration test suites
├── frontend/              # Next.js 14 editorial minimalist interface
│   └── src/
│       ├── app/           # App Router pages & layouts
│       ├── components/    # 3D identity core, D3 graph, evidence drawer
│       └── lib/           # Types, client helpers
├── docker-compose.yml     # Local orchestration (Postgres, Backend, Frontend)
├── .env.example           # Environment template (no secrets)
└── .gitignore
```

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+ (20+ recommended)
- Docker & Docker Compose (optional, for containerized run)

### Running with Docker
```bash
cp .env.example .env
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`

---

## License
MIT License. Created as an independent digital footprint intelligence research platform.
