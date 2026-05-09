# Decentralized Voting System Implementation Plan

**Goal:** Build a secure, 3D-animated Ethereum voting platform.

**Architecture:** Hybrid off-chain auth (FastAPI) + On-chain tally (Solidity).

**Tech Stack:** Solidity, Hardhat, FastAPI, MySQL, Three.js, GSAP.

---

### Task 1: Project Initialization
[x] Create directories (backend, frontend, blockchain)
[x] Create README.md
[ ] Initialize Hardhat in `blockchain/`
[ ] Initialize FastAPI in `backend/`
[ ] Initialize Vite in `frontend/`

### Task 2: Blockchain - Voting Smart Contract
- Create `Voting.sol` with:
    - Candidate management (Admin only)
    - Voting logic (1 address = 1 vote)
    - Results retrieval
- Test using Hardhat.

### Task 3: Backend - Auth API
- Setup FastAPI with SQLAlchemy (MySQL).
- Implement JWT Auth.
- Endpoint to link Voter ID to MetaMask address.

### Task 4: Frontend - 3D UI
- Setup Three.js scene.
- Implement Lenis smooth scroll.
- GSAP animations for scrolling interactions.

### Task 5: Web3 Integration
- Connect MetaMask.
- Call smart contract methods from UI.
- Real-time tally display.

### Task 6: Production Polish
- Admin dashboard.
- SEO and metadata.
- Deployment scripts.
