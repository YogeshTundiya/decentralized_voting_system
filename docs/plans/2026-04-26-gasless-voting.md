# Gasless Voting and UI Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement gasless backend-relayed voting to remove MetaMask dependency for mobile voters, and add an attractive "Why ETH.VOTE" section to the frontend.

**Architecture:** We will modify the `Voting.sol` smart contract to allow the Admin (Backend) to cast votes on behalf of users identified by their username string. The FastAPI backend will track user vote status and send the Ethereum transaction directly using `web3.py`. The Vite frontend will remove MetaMask logic, immediately show the portal on login, and add new landing page sections with GSAP animations.

**Tech Stack:** Solidity, FastAPI, Web3.py, Vite, HTML/CSS, GSAP.

---

### Task 1: Update Smart Contract for Gasless Voting

**Files:**
- Modify: `/home/yogesh/Documents/myproject/votingsystem/blockchain/contracts/Voting.sol`
- Modify: `/home/yogesh/Documents/myproject/votingsystem/blockchain/scripts/deploy.js`

**Step 1: Write the minimal implementation**

```solidity
// In Voting.sol, add a new mapping and function
mapping(string => Voter) public votersByUsername;

function adminCastVote(string memory _username, uint _candidateId) public onlyOwner {
    require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID");
    
    bool isUpdate = false;
    if (votersByUsername[_username].hasVoted) {
        uint previousId = votersByUsername[_username].votedCandidateId;
        candidates[previousId].voteCount--;
        isUpdate = true;
    }

    votersByUsername[_username].hasVoted = true;
    votersByUsername[_username].votedCandidateId = _candidateId;
    candidates[_candidateId].voteCount++;

    emit Voted(_candidateId, msg.sender, isUpdate);
}
```

**Step 2: Run test to verify it compiles**

Run: `npx hardhat compile` inside `/home/yogesh/Documents/myproject/votingsystem/blockchain`
Expected: PASS

**Step 3: Commit**

```bash
git add blockchain/contracts/Voting.sol
git commit -m "feat(blockchain): add adminCastVote for gasless voting"
```

---

### Task 2: Backend Endpoint for Gasless Voting

**Files:**
- Modify: `/home/yogesh/Documents/myproject/votingsystem/backend/requirements.txt`
- Modify: `/home/yogesh/Documents/myproject/votingsystem/backend/models.py`
- Modify: `/home/yogesh/Documents/myproject/votingsystem/backend/main.py`

**Step 1: Update Models and Requirements**

Add `web3` to `requirements.txt`.
Add `has_voted = Column(Boolean, default=False)` and `voted_candidate_id = Column(Integer, nullable=True)` to `User` model in `models.py`.

**Step 2: Write minimal implementation in main.py**

```python
from web3 import Web3

# Setup Web3
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))
# Load ABI from compiled contract json
# Implement POST /cast-gasless-vote endpoint
```

**Step 3: Run test to verify it passes**

Run: Check uvicorn logs for successful startup.
Expected: PASS

**Step 4: Commit**

```bash
git add backend/requirements.txt backend/models.py backend/main.py
git commit -m "feat(backend): implement /cast-gasless-vote endpoint with web3"
```

---

### Task 3: Remove MetaMask from Frontend

**Files:**
- Modify: `/home/yogesh/Documents/myproject/votingsystem/frontend/src/main.js`

**Step 1: Write the minimal implementation**

Remove `ethers.js` wallet connection logic. 
Update `window.castVote(candidateId)` to send a `POST /cast-gasless-vote` directly to the backend.
Update `loadCandidates()` to fetch candidates from a new backend endpoint `GET /candidates` OR read directly from the blockchain using a read-only ethers provider.

**Step 2: Run test to verify it passes**

Run: Try clicking vote on frontend.
Expected: PASS without MetaMask popup.

**Step 3: Commit**

```bash
git add frontend/src/main.js
git commit -m "feat(frontend): remove MetaMask and switch to backend voting"
```

---

### Task 4: Add "Why ETH.VOTE" Section & Mobile UI Polish

**Files:**
- Modify: `/home/yogesh/Documents/myproject/votingsystem/frontend/index.html`
- Modify: `/home/yogesh/Documents/myproject/votingsystem/frontend/src/style.css`

**Step 1: Write the minimal implementation**

Add new HTML sections detailing the advantages of the system (Immutable, Transparent, Gasless).
Add responsive CSS for mobile.

**Step 2: Run test to verify it passes**

Run: View frontend in browser.
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/index.html frontend/src/style.css
git commit -m "feat(frontend): add advantages section and polish mobile UI"
```
