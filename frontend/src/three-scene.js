import * as THREE from 'three';

export function initThree(canvasId) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x007AFF, 2);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Objects
    // Main Cage
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x3C3C3D,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Glowing Core
    const coreGeom = new THREE.IcosahedronGeometry(0.8, 1);
    const coreMat = new THREE.MeshStandardMaterial({
        color: 0x007AFF,
        emissive: 0x007AFF,
        emissiveIntensity: 2,
        wireframe: true
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    scene.add(core);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);
    for(let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0xffffff
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation logic
    const animate = () => {
        cube.rotation.y += 0.005;
        cube.rotation.x += 0.002;
        core.rotation.y -= 0.01;
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();

    return { cube, core, camera, scene };
}
