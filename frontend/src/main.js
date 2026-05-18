import { ethers } from 'ethers';
import gsap from 'gsap';
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

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

let currentUser = null;
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
                // Safely decode Base64Url
                const base64Url = data.access_token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decodedPayload = JSON.parse(atob(base64));
                
                if (decodedPayload.is_admin) {
                    window.location.href = 'admin.html';
                    return;
                }
                authModal.classList.remove('active');
                showVoterPortal();
            } else {
                alert("Identity Registered! Please Login.");
                isLogin = true;
                toggleAuth.click();
            }
        } else {
            alert(data.detail || "Authentication Failed");
        }
    } catch (err) {
        console.error(err);
        alert("Login failed or backend server offline.");
    }
});

// --- Portal Logic ---
connectBtn.addEventListener('click', () => {
    if (localStorage.getItem('token')) {
        const base64Url = localStorage.getItem('token').split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = JSON.parse(atob(base64));
        
        if (decodedPayload.is_admin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'voter.html';
        }
    } else {
        authModal.classList.add('active');
    }
});

async function showVoterPortal() {
    window.location.href = 'voter.html';
}

if (localStorage.getItem('token')) {
    connectBtn.innerText = 'Go to Portal';
}
