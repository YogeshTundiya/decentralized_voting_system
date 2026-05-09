import { ethers } from 'ethers';
import gsap from 'gsap';
import Lenis from 'lenis';

// IMPORT AND INITIALIZE OUR NEW 3D BACKGROUND
import { initThree } from './three-scene.js';
initThree('#webgl-canvas');

// --- Initialization ---
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// --- GSAP Animations ---
gsap.from(".reveal-text", {
    y: 100,
    opacity: 0,
    duration: 1.2,
    ease: "power4.out",
    stagger: 0.2
});

gsap.from(".hero-subtext, .hero-actions", {
    opacity: 0,
    y: 30,
    duration: 1,
    delay: 0.5,
    ease: "power3.out"
});

// --- Blockchain Config ---
const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const contractABI = [
    "function vote(uint candidateId, bytes signature) public",
    "function getAllCandidates() public view returns (tuple(uint id, string name, uint voteCount)[])",
    "function hasVoted(address voter) public view returns (bool)"
];

let provider, signer, contract;
const connectBtn = document.getElementById('connectWallet');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
let isLogin = true;

// --- Auth Logic ---
document.getElementById('closeModal').addEventListener('click', () => {
    authModal.classList.remove('active');
});

toggleAuth.addEventListener('click', () => {
    isLogin = !isLogin;
    document.getElementById('modalTitle').innerText = isLogin ? 'Voter Access' : 'Register Identity';
    document.getElementById('submitBtn').innerText = isLogin ? 'Access Portal' : 'Create Account';
    document.getElementById('email').style.display = isLogin ? 'none' : 'block';
    toggleAuth.innerHTML = isLogin ? "Don't have an account? <span>Register</span>" : "Already have an account? <span>Login</span>";
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? 'http://localhost:8000/login' : 'http://localhost:8000/register';
    const payload = {
        username: e.target.username.value,
        password: e.target.password.value,
        ...(isLogin ? {} : { email: e.target.email.value })
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (response.ok) {
            if (isLogin) {
                localStorage.setItem('token', data.access_token);
                const decodedPayload = JSON.parse(atob(data.access_token.split('.')[1]));
                if (decodedPayload.is_admin) {
                    window.location.href = 'admin.html';
                    return;
                }
                authModal.classList.remove('active');
                connectMetaMask();
            } else {
                alert("Identity Registered! Please Login.");
                isLogin = true;
                toggleAuth.click();
            }
        } else {
            alert(data.detail || "Authentication Failed");
        }
    } catch (err) {
        alert("Backend server offline.");
    }
});

// --- MetaMask & Portal Logic ---
connectBtn.addEventListener('click', () => {
    if (localStorage.getItem('token')) {
        connectMetaMask();
    } else {
        authModal.classList.add('active');
    }
});

async function connectMetaMask() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }

    try {
        provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        connectBtn.innerText = accounts[0].slice(0, 6) + '...' + accounts[0].slice(-4);
        connectBtn.classList.add('connected');

        showVoterPortal();
    } catch (error) {
        console.error("MetaMask connection failed", error);
    }
}

async function showVoterPortal() {
    const portal = document.getElementById('voterPortal');
    portal.classList.remove('hidden');
    
    // Smooth scroll to portal
    lenis.scrollTo(portal, { duration: 1.5 });

    loadCandidates();
}

async function loadCandidates() {
    const list = document.getElementById('candidatesList');
    try {
        const candidates = await contract.getAllCandidates();
        list.innerHTML = '';
        
        candidates.forEach(c => {
            const card = document.createElement('div');
            card.className = 'info-card glass-panel';
            card.innerHTML = `
                <div class="icon">CANDIDATE ID: ${c.id}</div>
                <h3>${c.name}</h3>
                <p>Current Votes: ${c.voteCount}</p>
                <button class="btn btn-primary" style="margin-top:20px" onclick="window.castVote(${c.id})">Vote for ${c.name}</button>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        list.innerHTML = '<p style="opacity:0.5">Please ensure your local blockchain is running and you are connected.</p>';
    }
}

// Global function for voting
window.castVote = async (candidateId) => {
    try {
        const ethAddress = await signer.getAddress();
        const token = localStorage.getItem('token');
        
        // 1. Get Authorization Signature from Backend
        const authRes = await fetch(`http://localhost:8000/authorize-vote?eth_address=${ethAddress}&candidate_id=${candidateId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            method: 'POST'
        });
        
        const { signature } = await authRes.json();
        
        // 2. Submit Transaction to Blockchain
        const tx = await contract.vote(candidateId, signature);
        await tx.wait();
        
        alert("Vote Cast Successfully on Ethereum!");
        loadCandidates();
    } catch (err) {
        console.error("Full Vote Error:", err);
        // Extract the most readable part of the error message
        let errorMsg = err.reason || err.message || "Unknown error";
        if (err.info && err.info.error && err.info.error.message) {
            errorMsg = err.info.error.message;
        }
        alert("Transaction Failed: " + errorMsg);
    }
};

// Check if already authenticated on load
if (localStorage.getItem('token')) {
    connectBtn.innerText = 'Connected Portal';
}
