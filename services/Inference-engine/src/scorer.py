import os
import json
import logging
import time
import redis
from redis.exceptions import ResponseError
from typing import Any
from sqlalchemy import create_engine, String, Float, DateTime
from sqlalchemy.orm import declarative_base, mapped_column, Mapped, sessionmaker
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inference-engine")

REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
STREAM_NAME = "fraud-events-stream"
GROUP_NAME = "inference-processing-group"
CONSUMER_NAME = "inference-worker-1"

# Windows-safe relative SQLite path matching case-management
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
os.makedirs(BASE_DIR, exist_ok=True)
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(BASE_DIR, "fraud_cases.db"))

# Setup SQLite Database Connection
engine = create_engine(f"sqlite:///{SQLITE_DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FraudCaseModel(Base):
    __tablename__ = "fraud_cases"
    
    user_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_tier: Mapped[str] = mapped_column(String, nullable=False)
    flagged_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PENDING_REVIEW")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Use standard synchronous Redis client
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def setup_consumer_group():
    """Ensures the Redis consumer group exists for the stream."""
    try:
        redis_client.xgroup_create(STREAM_NAME, GROUP_NAME, id="0", mkstream=True)
        logger.info(f"Consumer group '{GROUP_NAME}' initialized on stream '{STREAM_NAME}'.")
    except ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info(f"Consumer group '{GROUP_NAME}' already exists.")
        else:
            raise e

def evaluate_risk_logic(event):
    """Calculates risk score based on event attributes and Redis feature lookups."""
    user_id = event.get("user_id")
    is_vpn = event.get("is_vpn", False)
    event_type = event.get("event_type")
    
    # Check velocity count from Redis feature store
    zset_key = f"user:{user_id}:recent_events"
    try:
        raw_count: Any = redis_client.zcard(zset_key)
        recent_events_count = int(raw_count) if raw_count is not None else 0
    except Exception:
        recent_events_count = 0
    
    score = 15.0
    reasons = ["Standard telemetry evaluation."]
    
    if is_vpn:
        score += 40.0
        reasons.append("Connection originating from flagged VPN/Proxy IP.")
        
    if recent_events_count > 3:
        score += 25.0
        reasons.append(f"High velocity actions detected ({recent_events_count} events).")
        
    if event_type == "LOAN_APPLICATION" and is_vpn:
        score += 20.0
        reasons.append("Instant high-risk credit draw following suspicious session shift.")
        
    return min(score, 100.0), " | ".join(reasons)

def run_inference_worker():
    setup_consumer_group()
    logger.info(f"Inference Engine listening to Redis Stream -> Writing to {SQLITE_DB_PATH}")
    
    while True:
        try:
            # Read messages assigned to this consumer group with a 2-second block to prevent CPU throttling
            streams: Any = redis_client.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={STREAM_NAME: ">"},
                count=10,
                block=2000,
            )
            
            if streams:
                for stream, messages in streams:
                    for message_id, data in messages:
                        try:
                            payload_raw = data.get("payload")
                            if not payload_raw:
                                redis_client.xack(STREAM_NAME, GROUP_NAME, message_id)
                                continue
                                
                            event = json.loads(payload_raw)
                            user_id = event.get("user_id")
                            
                            # Run Scoring & Evaluation
                            risk_score, reason = evaluate_risk_logic(event)
                            risk_tier = "CRITICAL" if risk_score >= 80 else ("HIGH" if risk_score >= 50 else "LOW")
                            
                            # Persist high-risk or all evaluated cases to SQLite
                            if risk_score >= 50:
                                db = SessionLocal()
                                try:
                                    existing_case = db.query(FraudCaseModel).filter(FraudCaseModel.user_id == user_id).first()
                                    if existing_case:
                                        existing_case.risk_score = risk_score
                                        existing_case.risk_tier = risk_tier
                                        existing_case.flagged_reason = reason
                                        existing_case.updated_at = datetime.utcnow()
                                    else:
                                        new_case = FraudCaseModel(
                                            user_id=user_id,
                                            risk_score=risk_score,
                                            risk_tier=risk_tier,
                                            flagged_reason=reason
                                        )
                                        db.add(new_case)
                                    db.commit()
                                    logger.info(f"Persisted case for user {user_id} with score {risk_score} ({risk_tier}).")
                                except Exception as db_err:
                                    db.rollback()
                                    logger.error(f"Database error: {db_err}")
                                finally:
                                    db.close()
                            
                            # Acknowledge message successfully processed
                            redis_client.xack(STREAM_NAME, GROUP_NAME, message_id)
                            
                        except Exception as inner_e:
                            logger.error(f"Error processing message {message_id}: {inner_e}")
                            
        except Exception as e:
            logger.error(f"Redis stream read error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    time.sleep(2)  # Wait for Redis to boot
    run_inference_worker()