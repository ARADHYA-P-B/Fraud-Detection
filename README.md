# Digital Fraud Investigation Platform

An enterprise-grade, microservices-based digital fraud detection and case management system designed to catch Account Takeover (ATO) and instant credit fraud in real time. 

This platform uses a lightweight, high-performance **Kafka-free stack** powered by **Redis Streams** for event streaming, a **Redis Online Feature Store** for velocity tracking, **SQLite** for local case persistence, and **FastAPI** for API endpoints.

---

## Architecture & Microservices

```text
digital-fraud-investigation-platform/
├── docker-compose.yml              # Orchestrates Redis & all 4 microservices
├── requirements.txt                # Master Python dependencies
├── data/                           # Local SQLite database & persistence volume
└── services/
    ├── ingestion-service/          # Service 1: High-throughput telemetry collector (FastAPI)
    ├── stream-worker/              # Service 2: Redis Stream consumer & sliding-window velocity tracker
    ├── inference-engine/           # Service 3: Real-time risk scoring & SQLite case writer
    └── case-management/            # Service 4: Analyst dashboard REST API & case actions (FastAPI)