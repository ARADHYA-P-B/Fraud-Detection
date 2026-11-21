# Prism Fraud Shield — Real-Time Fraud Detection Platform

An end-to-end real-time fraud detection and case investigation platform built with **FastAPI**, **Redis Streams**, **SQLite** (via SQLAlchemy), a background **Inference Engine worker**, and a **React/Vite frontend** served via **Nginx**.

## Architecture Overview

The system is organized into five coordinated components:

- **Redis (`redis:7-alpine`)**: Acts as the real-time event broker (`fraud-events-stream`), consumer group coordinator (`inference-processing-group`), and velocity feature store (`user:<user_id>:recent_events`).
- **Ingestion Service (Port `8000`)**: FastAPI service that receives incoming events and publishes telemetry to Redis.
- **Inference Engine Worker**: Background Python worker (`worker.py`) that consumes from `fraud-events-stream`, evaluates risk scores and velocity signals, and persists flagged cases to SQLite.
- **Case Management Service (Port `8001`)**: FastAPI service that queries and manages fraud cases stored in SQLite.
- **Frontend (Port `80`)**: React/Vite dashboard served through Nginx with threat filtering, ATO attack simulation, and feed syncing.

### Shared Persistence

- Both **Case Management** and **Inference Engine** share a SQLite database (`fraud_cases.db`) containing the `fraud_cases` table.
- In Docker Compose, `./data:/app/data` is mounted to both services and `SQLITE_DB_PATH=/app/data/fraud_cases.db` is configured so reads and writes stay synchronized across container restarts.

## Project Structure

```text
Fraud_detection/
├── docker-compose.yml
├── .gitignore
├── README.md
├── data/
│   └── fraud_cases.db
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── services/
    ├── ingestion-service/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── src/
    │       └── main.py
    ├── case-management/
    │   ├── Dockerfile
    │   ├── requirements.txt
    │   └── src/
    │       └── main.py
    └── inference-engine/
        ├── Dockerfile
        ├── requirements.txt
        └── src/
            └── worker.py
```

## Quick Start with Docker Compose

From the project root (`Fraud_detection/`), build the images and start all services in detached mode:

```bash
docker compose build --no-cache
docker compose up -d
```

Check container status and inspect logs:

```bash
docker compose ps
docker compose logs -f inference-engine
```

Once running, open **`http://localhost`** in your browser.

### Stopping & Rebuilding

```bash
# Stop containers
docker compose down

# Rebuild and restart after code changes
docker compose up -d --build
```

## Environment Variables

| Variable | Services | Default / Example | Description |
| :--- | :--- | :--- | :--- |
| `REDIS_HOST` | `ingestion-service`, `inference-engine` | `redis` (in Compose) / `127.0.0.1` (local) | Redis hostname or IP |
| `REDIS_PORT` | `ingestion-service`, `inference-engine` | `6379` | Redis port |
| `SQLITE_DB_PATH` | `case-management`, `inference-engine` | `/app/data/fraud_cases.db` | Path to shared SQLite database file |
| `VITE_INGEST_API_URL` | `frontend` (build arg) | `http://localhost:8000/api/v1` | Ingestion API base URL baked into frontend build |
| `VITE_CASE_API_URL` | `frontend` (build arg) | `http://localhost:8001/api/v1` | Case Management API base URL baked into frontend build |


## Troubleshooting Notes

- **Empty dashboard table after simulating an event**: Confirm both `case-management` and `inference-engine` point to the exact same `SQLITE_DB_PATH` (`./data:/app/data` in Docker Compose), check `http://localhost:8001/api/v1/cases?min_risk_score=0`, and click **Sync Feed** or set the filter to **ALL**.
- **Build errors on `COPY requirements.txt .`**: Ensure each service has its own `requirements.txt` inside its service directory and that `docker-compose.yml` sets `context:` to that service folder.
- **Separate frontend & backend hosting**: Update `VITE_INGEST_API_URL` and `VITE_CASE_API_URL` to your backend URLs and allow your frontend origin in FastAPI `CORSMiddleware`.

## Architecture 
                      +-----------------------------------+
                      |    React / Vite Frontend (UI)     |
                      |       Served via Nginx (:80)      |
                      +-----------------+-----------------+
                                        |
              +-------------------------+-------------------------+
              | HTTP / REST                                       | HTTP / REST
              v                                                   v
+-----------------------------+                     +-----------------------------+
|      Ingestion Service      |                     |   Case Management Service   |
|       FastAPI (:8000)       |                     |       FastAPI (:8001)       |
+--------------+--------------+                     +--------------+--------------+
               |                                                   ^
               | XADD / Velocity ZSET                              | Read / Update Cases
               v                                                   v
+-------------------------------------------------------------------+
|                           Redis (:6379)                           |
|  - Stream: fraud-events-stream                                    |
|  - Consumer Group: inference-processing-group                     |
|  - Feature Store: user:<user_id>:recent_events (Sorted Set)       |
+---------------------------------+---------------------------------+
                                  |
                                  | XREADGROUP / ZCARD / XACK
                                  v
                 +---------------------------------+
                 |     Inference Engine Worker     |
                 |      Python (worker.py)         |
                 +----------------+----------------+
                                  |
                                  | Write High-Risk Cases (score >= 50)
                                  v
                 +---------------------------------+
                 |     SQLite (fraud_cases.db)     |
                 |   Table: fraud_cases            |
                 |   Mounted Volume: ./data        |
                 +---------------------------------+