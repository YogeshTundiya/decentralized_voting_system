from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Using SQLite for local development if MySQL isn't configured yet, 
# but user requested MySQL, so I'll provide the pattern for it.
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+connectorpython://root:password@localhost/voting_db")

# Fallback to SQLite for easier initial setup if user hasn't provided DB creds
if not os.getenv("DATABASE_URL"):
    DATABASE_URL = "sqlite:///./voting.db"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
