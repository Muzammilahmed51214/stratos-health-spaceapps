"""
Database configuration and session management for StratosHealth Backend.
Uses SQLite for local development and hackathon demo caching.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Database URL pointing to a local SQLite file in the backend directory
DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./stratos_health.db")

# SQLite connection args to allow multi-threaded FastAPI async handlers
connect_args = {"check_same_thread": False} if DB_PATH.startswith("sqlite") else {}

engine = create_engine(
    DB_PATH,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a transactional database session per request.
    Ensures sessions are closed properly after completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
