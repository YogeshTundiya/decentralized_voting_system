import * as THREE from 'three';
import gsap from 'gsap';

export function initThree(canvasId) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    
    // Explicitly set dark background so it renders
    renderer.setClearColor(new THREE.Color('#000000'));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.04); 

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 14;

    // --- Particle System Generation ---
    const particleCount = 6000;
    const positions = new Float32Array(particleCount * 3);
    const chainPositions = new Float32Array(particleCount * 3);
    const wallPositions = new Float32Array(particleCount * 3);
    const randomOffsets = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 1. Chain Object (Interlocking Rings)
        const isFirstLink = i < particleCount / 2;
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        const R = 3; 
        const r = 0.8 + Math.random() * 0.6; 
        
        let cx = (R + r * Math.cos(v)) * Math.cos(u);
        let cy = (R + r * Math.cos(v)) * Math.sin(u);
        let cz = r * Math.sin(v);

        if (!isFirstLink) {
            cx += R; 
            let temp = cy; cy = cz; cz = temp; 
        }
        cx -= R / 2; 
        
        chainPositions[i3] = cx;
        chainPositions[i3 + 1] = cy;
        chainPositions[i3 + 2] = cz;

        // 2. Wall Object (Curved Security Shield)
        const wu = (Math.random() - 0.5) * Math.PI * 0.9;
        const wv = (Math.random() - 0.5) * 12;
        const wR = 10;
        
        const wx = Math.sin(wu) * wR;
        const wy = wv;
        const wz = Math.cos(wu) * wR - 5; 

        wallPositions[i3] = wx;
        wallPositions[i3 + 1] = wy;
        wallPositions[i3 + 2] = wz;

        // Init positions
        positions[i3] = cx;
        positions[i3 + 1] = cy;
        positions[i3 + 2] = cz;

        // Floating organic effect
        randomOffsets[i3] = Math.random() * Math.PI * 2;
        randomOffsets[i3+1] = Math.random() * Math.PI * 2;
        randomOffsets[i3+2] = Math.random() * Math.PI * 2;

        sizes[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aChainPos', new THREE.BufferAttribute(chainPositions, 3));
    geometry.setAttribute('aWallPos', new THREE.BufferAttribute(wallPositions, 3));
    geometry.setAttribute('aRandomOffset', new THREE.BufferAttribute(randomOffsets, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uProgress: { value: 0 },
            uColor1: { value: new THREE.Color(0xffffff) },
            uColor2: { value: new THREE.Color(0x00D8FF) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uProgress;
            attribute vec3 aChainPos;
            attribute vec3 aWallPos;
            attribute vec3 aRandomOffset;
            attribute float aSize;
            
            varying float vSize;
            varying float vProgress;
            
            void main() {
                vProgress = uProgress;
                vec3 targetPos = mix(aChainPos, aWallPos, uProgress);
                
                float floatX = sin(uTime * 0.4 + aRandomOffset.x) * 0.6;
                float floatY = cos(uTime * 0.3 + aRandomOffset.y) * 0.6;
                float floatZ = sin(uTime * 0.5 + aRandomOffset.z) * 0.6;
                
                vec3 finalPos = targetPos + vec3(floatX, floatY, floatZ);
                vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                gl_PointSize = (aSize * 6.0 + 1.0) * (20.0 / -mvPosition.z);
                vSize = aSize;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying float vSize;
            varying float vProgress;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = (0.5 - dist) * 2.0 * (vSize * 0.6 + 0.1);
                vec3 color = mix(uColor1, uColor2, vProgress);
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // --- Ambient Atmosphere ---
    const atmosGeo = new THREE.BufferGeometry();
    const atmosCount = 600;
    const atmosPos = new Float32Array(atmosCount * 3);
    for(let i=0; i<atmosCount*3; i++) {
        atmosPos[i] = (Math.random() - 0.5) * 40;
    }
    atmosGeo.setAttribute('position', new THREE.BufferAttribute(atmosPos, 3));
    const atmosMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x007AFF,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const atmos = new THREE.Points(atmosGeo, atmosMat);
    scene.add(atmos);

    // --- Interactivity ---
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        let progress = Math.min(Math.max(scrollTop / 800, 0), 1);
        
        gsap.to(material.uniforms.uProgress, {
            value: progress,
            duration: 1.5,
            ease: 'power2.out'
        });
    });

    const clock = new THREE.Clock();

    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        material.uniforms.uTime.value = elapsedTime;

        particles.rotation.y += (mouseX * 0.2 - particles.rotation.y) * 0.05;
        particles.rotation.x += (-mouseY * 0.2 - particles.rotation.x) * 0.05;
        particles.rotation.y += 0.0005;

        atmos.rotation.y = elapsedTime * 0.02;
        atmos.rotation.x = elapsedTime * 0.01;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}
