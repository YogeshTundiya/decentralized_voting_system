# Decentralized Voting System (Ethereum + FastAPI)

A premium, tamper-proof voting DApp featuring an Apple-style luxury minimal frontend, robust Python/FastAPI backend, and Ethereum-based smart contracts.

## Architecture
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **Backend**: Python, FastAPI, SQLite/MySQL, JWT Authentication
- **Frontend**: Vite, GSAP, Lenis Smooth Scroll

## Directory Structure
- `blockchain/`: Smart contracts and deployment scripts.
- `backend/`: FastAPI authentication and voter management.
- `frontend/`: Luxury minimal, glassmorphic UI.
- `docs/`: Design and implementation documentation.

---

## 🚀 How to Run the Application

This system consists of three separate services that need to run concurrently. Open three separate terminal windows to run them.

### 1. Start the Local Blockchain Node
First, you need to spin up your local Ethereum network and deploy the smart contract.

```bash
# Terminal 1
cd blockchain

# Start the local Hardhat node
npx hardhat node

# Keep this terminal running!
```

*Note: If you haven't deployed the contract yet, open a new terminal, navigate to `blockchain`, and run `npx hardhat run scripts/deploy.js --network localhost`. Copy the deployed contract address and update it in `frontend/src/main.js` and `frontend/src/admin.js` if necessary.*

---

### 2. Start the Python Backend
The backend manages identity authentication and issues voting authorization tokens.

```bash
# Terminal 2
cd backend

# Create the virtual environment
python3 -m venv venv

# Activate the virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
# .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```

The backend server will run at `http://localhost:8000`.

---

### 3. Start the Frontend
The frontend provides the luxury minimal interface.

```bash
# Terminal 3
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## ⚙️ Configuration: Changing Blockchain Address

When you deploy your smart contract, you will get a new contract address. You **must** update this address in both the Backend and Frontend for the system to work.

### 1. Update Backend
Open `backend/main.py` and update the `VOTING_CONTRACT_ADDRESS` on line 27:
```python
VOTING_CONTRACT_ADDRESS = "0xYourNewContractAddress"
```

### 2. Update Frontend
Open `frontend/src/main.js` and update the `contractAddress` on line 31:
```javascript
const contractAddress = "0xYourNewContractAddress";
```

### 3. Update Admin Panel
Open `frontend/src/admin.js` and update the `contractAddress` at the top:
```javascript
const contractAddress = "0xYourNewContractAddress";
```

---

## 🦊 MetaMask Setup
1. Install MetaMask.
2. Connect to Local Network: `http://127.0.0.1:8545` (Chain ID: `31337`).
3. Import a test account using one of the private keys displayed in Terminal 1 (Hardhat node).

