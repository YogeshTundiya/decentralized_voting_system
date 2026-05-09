import { ethers } from 'ethers';
import Lenis from 'lenis';

// Initialize Smooth Scroll
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const contractABI = [
    "function addCandidate(string name) public",
    "function getAllCandidates() public view returns (tuple(uint id, string name, uint voteCount)[])",
    "function owner() public view returns (address)"
];

let provider, signer, contract;

async function init() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return;
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
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

        candidates.forEach(c => {
            const row = `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.voteCount}</td>
                    <td>0x${Math.random().toString(16).slice(2, 10)}...</td>
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

init();
