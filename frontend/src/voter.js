import { ethers } from 'ethers';
import Lenis from 'lenis';
import { initThree } from './three-scene.js';

initThree('#webgl-canvas');

// --- Initialization ---
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

async function checkAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function loadCandidates() {
    const list = document.getElementById('candidatesList');
    if (!list) return;

    try {
        const response = await fetch('http://localhost:8000/candidates');
        const candidates = await response.json();
        
        list.innerHTML = '';
        if (candidates.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary);">No candidates found for this election.</p>';
            return;
        }

        candidates.forEach(c => {
            const card = document.createElement('div');
            card.className = 'info-card glass-panel';
            card.style.background = 'rgba(255,255,255,0.02)';
            card.innerHTML = `
                <div class="icon">CANDIDATE ID: ${c.id}</div>
                <h3>${c.name}</h3>
                <p style="margin-bottom: 24px; color: var(--text-secondary);">Current Votes: <span style="color:var(--text-primary); font-weight: 600;">${c.voteCount}</span></p>
                <button id="vote-btn-${c.id}" class="btn btn-primary" style="width: 100%; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white;" onclick="window.castVote(${c.id})">Vote for ${c.name}</button>
            `;
            list.appendChild(card);
        });
    } catch (err) {
        list.innerHTML = '<p style="opacity:0.5; padding: 20px;">Backend server offline. Please ensure it is running.</p>';
    }
}

window.castVote = async (candidateId) => {
    const btn = document.getElementById(`vote-btn-${candidateId}`);
    const originalText = btn.innerText;
    
    try {
        btn.innerText = "Processing Transaction...";
        btn.disabled = true;
        
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/cast-gasless-vote?candidate_id=${candidateId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            method: 'POST'
        });
        
        const data = await response.json();
        if (response.ok) {
            alert("Vote Cast Successfully! Hash: " + data.tx_hash);
            loadCandidates();
        } else {
            alert(data.detail || "Transaction Failed");
        }
    } catch (err) {
        console.error("Full Vote Error:", err);
        alert("Network Error: Could not connect to backend.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});

// Run
checkAuth().then(isAuth => {
    if(isAuth) loadCandidates();
});
