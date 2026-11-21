import os
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, String, Float, DateTime, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session, sessionmaker

# Ensure local data directory exists on Windows
os.makedirs("./data", exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/fraud_cases.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class FraudCaseModel(Base):
    __tablename__ = "fraud_cases"

    user_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_tier: Mapped[str] = mapped_column(String, nullable=False)
    flagged_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="PENDING_REVIEW")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Case Management API")

# Enable CORS for Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CaseActionRequest(BaseModel):
    analyst_id: str
    action: str
    notes: str = ""
    lock_account: bool = False

@app.get("/api/v1/cases")
def list_cases(min_risk_score: float = 0.0, db: Session = Depends(get_db)):
    stmt = (
        select(FraudCaseModel)
        .where(FraudCaseModel.risk_score >= min_risk_score)
        .order_by(FraudCaseModel.updated_at.desc())
    )
    return db.scalars(stmt).all()

@app.post("/api/v1/cases/{user_id}/action")
def take_case_action(user_id: str, payload: CaseActionRequest, db: Session = Depends(get_db)):
    case = db.get(FraudCaseModel, user_id)
    if not case:
        raise HTTPException(status_code=404, detail="Fraud case not found")

    status_map = {
        "ESCALATE": "ESCALATED",
        "DISMISS": "DISMISSED",
        "INVESTIGATE": "INVESTIGATING",
    }
    case.status = status_map.get(payload.action.upper(), "PENDING_REVIEW")
    case.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(case)
    return {"status": "updated", "user_id": user_id, "new_status": case.status}