import os
from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# Define path for SQLite file (saves inside the local data/ folder)
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./data/fraud_cases.db")

# Ensure the parent directory exists
os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)

# Create SQLite Engine
# check_same_thread=False allows FastAPI multi-threading with SQLite
SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Session factory for database transactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for your ORM models
Base = declarative_base()

class FraudCaseModel(Base):
    __tablename__ = "fraud_cases"
    
    user_id = Column(String, primary_key=True, index=True)
    risk_score = Column(Float, nullable=False)
    risk_tier = Column(String, nullable=False)
    flagged_reason = Column(String)
    status = Column(String, default="PENDING_REVIEW")
    updated_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    """Creates the database file and tables if they don't exist."""
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized successfully at: {SQLITE_DB_PATH}")

if __name__ == "__main__":
    init_db()