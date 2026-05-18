import { ethers } from 'ethers';
import Lenis from 'lenis';

import { initThree } from './three-scene.js';
initThree('#webgl-canvas');

// Initialize Smooth Scroll
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI = [
    "function addCandidate(string name) public",
    "function getAllCandidates() public view returns (tuple(uint id, string name, uint voteCount)[])",
    "function owner() public view returns (address)",
    "event CandidateAdded(uint indexed candidateId, string name)"
];

let provider, signer, contract;

async function init() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return;
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []); // explicitly request accounts
        signer = await provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);

        loadCandidates();
    } else {
        alert("Please install MetaMask!");
    }
}

async function loadCandidates() {
    try {
        const candidates = await contract.getAllCandidates();
        const list = document.getElementById('adminCandidatesList');
        list.innerHTML = '';
        
        // Fetch candidate addition events to get the real transaction hash
        const filter = contract.filters.CandidateAdded();
        const events = await contract.queryFilter(filter);
        const txHashes = {};
        events.forEach(e => {
            txHashes[e.args.candidateId] = e.transactionHash;
        });

        candidates.forEach(c => {
            const txHash = txHashes[c.id] || "0x0000000000000000000000000000000000000000";
            const shortHash = txHash.slice(0, 10) + "...";
            const row = `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.voteCount}</td>
                    <td title="${txHash}">${shortHash}</td>
                </tr>
            `;
            list.innerHTML += row;
        });
    } catch (err) {
        console.error("Failed to load candidates:", err);
    }
}

document.getElementById('addCandidateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('candidateName').value;

    try {
        const tx = await contract.addCandidate(name);
        await tx.wait();
        alert("Candidate added to blockchain!");
        loadCandidates();
    } catch (err) {
        console.error("Transaction failed:", err);
        alert("Error adding candidate. Are you the admin?");
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// Election Status Toggle (Visual UI feature)
let isElectionOpen = false;
document.getElementById('toggleElection').addEventListener('click', (e) => {
    isElectionOpen = !isElectionOpen;
    const statusPill = document.getElementById('currentStatus');
    
    if (isElectionOpen) {
        statusPill.innerHTML = '<span class="pulse-dot" style="background:#34C759;box-shadow:0 0 10px #34C759"></span> Live';
        statusPill.style.color = '#34C759';
        statusPill.style.borderColor = 'rgba(52, 199, 89, 0.3)';
        e.target.innerText = 'Close Election';
    } else {
        statusPill.innerHTML = '<span class="pulse-dot" style="background:#FF3B30;box-shadow:0 0 10px #FF3B30"></span> Closed';
        statusPill.style.color = '#FF3B30';
        statusPill.style.borderColor = 'rgba(255, 59, 48, 0.3)';
        e.target.innerText = 'Open Election';
    }
});

init();
