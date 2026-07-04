# HCO Study

Web application for human-subject experiments on real-time challenge-response tasks (HCO research, Prolific recruitment).

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, SQLite |
| Frontend | React, Vite, Tailwind CSS, Framer Motion |
| Analysis | Python (`analysis/`) |

## Prerequisites

- **Docker** (recommended): Docker Engine 24+ and Docker Compose v2
- **Local dev**: Python 3.10+, Node.js 18+

## Quick start (Docker)

From the repository root:

```bash
cp .env.example .env   # optional — edit HCO_COMPLETION_CODE if needed
docker compose up --build
```

| Service | URL |
|---------|-----|
| App (frontend) | http://localhost:8080 |
| API (backend) | http://localhost:8000 |
| Health check | http://localhost:8000/api/health |
| Export CSV | http://localhost:8000/api/admin/export |

Prolific test URL:

```
http://localhost:8080/?PROLIFIC_PID=TEST123&STUDY_ID=STUDY456
```

Stop:

```bash
docker compose down
```

Reset database:

```bash
docker compose down -v
```

### Docker services

| Container | Role |
|-----------|------|
| `hco-db` | Persistent SQLite volume (`/data/hco_study.db`) |
| `hco-backend` | FastAPI API |
| `hco-frontend` | React app (nginx, proxies `/api` → backend) |

## Local development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HCO_DB_PATH` | SQLite database path | `backend/hco_study.db` |
| `HCO_COMPLETION_CODE` | Prolific completion code | `HCO-STUDY-COMPLETE` |
| `HCO_ADMIN_PASSWORD` | Admin dashboard login (`/admin`) | — (required for admin) |
| `FRONTEND_URL` | Production frontend URL (CORS) | — |
| `VITE_API_URL` | Backend URL for frontend build | `` (same origin) |

## Study flow

1. **Landing** — language selection, Prolific URL params
2. **Consent** — informed consent
3. **Guide** — challenge types overview (optional demo)
4. **Practice** — unscored trials
5. **Study** — 20 timed trials
6. **Debrief** — score and completion code

## Admin dashboard

Open **`/admin`** after setting `HCO_ADMIN_PASSWORD` on the backend.

| Feature | Description |
|---------|-------------|
| Live stats | Active participants (last 15 min), completed, clean runs |
| Reports | Pass rate and latency by challenge family |
| Sessions | All sessions with status (`clean`, `in_progress`, …) |
| Export | Download CSV (all trials or clean-only) |
| API health | `/api/health` and `/api/admin/health` |

Stats auto-refresh every 15 seconds while the dashboard is open.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/session/start` | Create session |
| POST | `/api/challenge/issue` | Issue challenge |
| POST | `/api/challenge/submit` | Submit response |
| POST | `/api/session/complete` | Complete session |
| POST | `/api/admin/login` | Admin login (password → token) |
| GET | `/api/admin/stats` | Dashboard stats (auth required) |
| GET | `/api/admin/analytics` | Clean-only charts & insights (auth required) |
| GET | `/api/admin/sessions` | Session list (auth required) |
| GET | `/api/admin/export` | Export trials CSV (auth required; `?clean=true`) |
| GET | `/api/admin/health` | Admin health (auth required) |

## Deploy

### Render (backend)

1. Connect this repository on [Render](https://render.com).
2. **Root Directory**: `backend`
3. **Build**: `pip install -r requirements.txt`
4. **Start**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set `HCO_COMPLETION_CODE`, `FRONTEND_URL`, and mount a disk at `/data` with `HCO_DB_PATH=/data/hco_study.db`.

Or use the included `render.yaml` blueprint.

### Vercel (frontend)

1. Import the repository on [Vercel](https://vercel.com).
2. **Root Directory**: `frontend`
3. **Framework**: Vite
4. Set `VITE_API_URL` to your Render backend URL.

## Git workflow

| Branch | Role |
|--------|------|
| `main` | Production — deployed to **hco-study.com** |
| `develop` | v2 integration (blockchain, admin, reporting, frontend) |
| `feature/*` | Individual features → merge into `develop` |

Current live release: tag **`v1.0.1`** on `main`.

Full branching rules: [BRANCHING.md](BRANCHING.md).

## Analysis

```bash
cd analysis
python stats.py ../backend/hco_study.db
python figures.py ../backend/hco_study.db
```

## License

Academic research use. See the HCO paper for citation details.
