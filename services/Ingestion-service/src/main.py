import os
import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestion-service")

app = FastAPI(title="Telemetry Ingestion Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
STREAM_NAME = "fraud-events-stream"

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
    socket_connect_timeout=2,
)

class TelemetryEvent(BaseModel):
    event_id: str = Field(..., description="Unique event identifier")
    user_id: str = Field(..., description="Unique user or account ID")
    session_id: str = Field(..., description="Active session ID")
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")
    event_type: str = Field(..., description="Type of event e.g. LOGIN, LOAN_APPLICATION")
    ip_address: str
    device_id: str
    is_vpn: bool = False
    metadata: dict = Field(default_factory=dict)

@app.get("/health")
def health_check():
    try:
        redis_client.ping()
        return {"status": "healthy", "redis": f"{REDIS_HOST}:{REDIS_PORT}"}
    except redis.ConnectionError as e:
        raise HTTPException(status_code=503, detail=f"Redis unreachable: {e}")

@app.post("/api/v1/events/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest_event(event: TelemetryEvent):
    try:
        payload = event.model_dump_json()
        message_id = redis_client.xadd(STREAM_NAME, {"payload": payload})
        logger.info(f"Queued event {event.event_id} -> stream ID {message_id}")
        return {
            "status": "accepted",
            "event_id": event.event_id,
            "stream_id": message_id,
        }
    except redis.ConnectionError as e:
        logger.error(f"Redis connection failed at {REDIS_HOST}:{REDIS_PORT}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Redis is not running on {REDIS_HOST}:{REDIS_PORT}",
        )
    except Exception as e:
        logger.error(f"Unexpected ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )