from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import models, database, auth
from eth_account import Account
from eth_account.messages import encode_defunct
import os

app = FastAPI(title="Decentralized Voting System API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB
models.Base.metadata.create_all(bind=database.engine)

# Admin Private Key for signing voter authorizations
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
VOTING_CONTRACT_ADDRESS = os.getenv("VOTING_CONTRACT_ADDRESS", "0x5FbDB2315678afecb367f032d93F642f64180aa3")

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: auth.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        email=user.email, 
        hashed_password=hashed_pwd,
        is_admin=user.is_admin
    )
    db.add(new_user)
    db.commit()
    return {"message": "User registered successfully"}

@app.post("/setup-admin")
def setup_admin(username: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"User {username} is now an admin"}

@app.post("/login")
def login(form_data: auth.UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user.username, "is_admin": user.is_admin})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/authorize-vote")
def authorize_vote(eth_address: str, candidate_id: int, current_user: models.User = Depends(auth.get_current_user)):
    from eth_abi.packed import encode_packed
    from eth_utils import keccak
    
    # Pack exactly like Solidity abi.encodePacked("Voter:", msg.sender, "Candidate:", _candidateId)
    # eth_address must be converted to checksum address to pack correctly
    from eth_utils import to_checksum_address
    checksum_addr = to_checksum_address(eth_address)
    
    packed = encode_packed(
        ['string', 'address', 'string', 'uint256'],
        ['Voter:', checksum_addr, 'Candidate:', candidate_id]
    )
    message_hash = keccak(packed)
    
    message = encode_defunct(primitive=message_hash)
    signed_message = Account.sign_message(message, private_key=ADMIN_PRIVATE_KEY)
    
    return {
        "voter": current_user.username,
        "signature": "0x" + signed_message.signature.hex()
    }

@app.get("/me")
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
