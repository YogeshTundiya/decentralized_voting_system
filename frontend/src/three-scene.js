import * as THREE from 'three';
import gsap from 'gsap';

export function initThree(canvasId) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true
    });
    
    // Explicitly set dark background
    renderer.setClearColor(new THREE.Color('#000000'));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.035); 

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    // Pull the camera back slightly to see the full objects
    camera.position.z = 18; 

    // --- Particle System Generation ---
    const particleCount = 15000; // Increased density for a solid look
    const positions = new Float32Array(particleCount * 3);
    const chainPositions = new Float32Array(particleCount * 3);
    const wallPositions = new Float32Array(particleCount * 3);
    const randomOffsets = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // ==========================================
        // 1. THE CHAIN (3 Clean Interlocking Rings)
        // ==========================================
        const ringGroup = i % 3; // Split particles into 3 rings
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        
        const R = 2.8; // Ring major radius
        const r = 0.45; // Ring thickness (tighter now for sharper shape)
        
        // Base Torus Math
        let cx = (R + r * Math.cos(v)) * Math.cos(u);
        let cy = (R + r * Math.cos(v)) * Math.sin(u);
        let cz = r * Math.sin(v);

        // Position and rotate rings to interlock
        if (ringGroup === 1) {
            // Right Ring
            cx += R * 1.1;
            let temp = cy; cy = cz; cz = temp; // Flip 90 degrees
        } else if (ringGroup === 2) {
            // Left Ring
            cx -= R * 1.1;
            let temp = cy; cy = cz; cz = temp; // Flip 90 degrees
        }
        
        chainPositions[i3] = cx;
        chainPositions[i3 + 1] = cy;
        chainPositions[i3 + 2] = cz;

        // ==========================================
        // 2. THE WALL (Structured Curved Matrix Grid)
        // ==========================================
        const wallWidth = 35;
        const wallHeight = 16;
        
        // Arrange particles in a grid rather than pure random
        const gridCols = Math.floor(Math.sqrt(particleCount * (wallWidth/wallHeight)));
        const row = Math.floor(i / gridCols);
        const col = i % gridCols;
        
        // Normalized coordinates (-0.5 to 0.5)
        const nx = (col / gridCols) - 0.5;
        const ny = (row / (particleCount / gridCols)) - 0.5;
        
        // Slight offset so it's not perfectly rigid, but keeps grid structure
        let wx = (nx * wallWidth) + (Math.random() - 0.5) * 0.3;
        let wy = (ny * wallHeight) + (Math.random() - 0.5) * 0.3;
        
        // Curve the wall backward at the edges (Parabola shape)
        let wz = -(nx * nx * 25) - 2; 

        wallPositions[i3] = wx;
        wallPositions[i3 + 1] = wy;
        wallPositions[i3 + 2] = wz;

        // Init starting positions
        positions[i3] = cx;
        positions[i3 + 1] = cy;
        positions[i3 + 2] = cz;

        // Unique offsets for the gentle breathing animation
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
            uColor1: { value: new THREE.Color('#ffffff') }, // Chain color
            uColor2: { value: new THREE.Color('#00D8FF') }  // Wall color (Cyber Blue)
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
                
                // Interpolate from Chain to Wall based on scroll
                vec3 targetPos = mix(aChainPos, aWallPos, uProgress);
                
                // TIGHTENED FLOATING NOISE (Reduced amplitude drastically so shape doesn't break)
                float floatX = sin(uTime * 1.2 + aRandomOffset.x) * 0.08;
                float floatY = cos(uTime * 0.9 + aRandomOffset.y) * 0.08;
                float floatZ = sin(uTime * 1.5 + aRandomOffset.z) * 0.08;
                
                // Add an epic twirl/scatter during the transition itself
                float scatter = sin(uProgress * 3.14159) * 2.0; // Spikes in the middle of transition
                float transitionScatterX = sin(aRandomOffset.y * 10.0 + uTime) * scatter;
                float transitionScatterY = cos(aRandomOffset.x * 10.0 + uTime) * scatter;
                float transitionScatterZ = sin(aRandomOffset.z * 10.0 + uTime) * scatter;

                vec3 finalPos = targetPos + vec3(floatX, floatY, floatZ) + vec3(transitionScatterX, transitionScatterY, transitionScatterZ);
                
                vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Keep particle sizes consistent
                gl_PointSize = (aSize * 4.0 + 1.0) * (20.0 / -mvPosition.z);
                vSize = aSize;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying float vSize;
            varying float vProgress;
            
            void main() {
                // Soft circular particles
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = (0.5 - dist) * 2.0 * (vSize * 0.8 + 0.2);
                
                // Blend colors smoothly
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

    // --- Ambient Atmosphere Background Particles ---
    const atmosGeo = new THREE.BufferGeometry();
    const atmosCount = 400;
    const atmosPos = new Float32Array(atmosCount * 3);
    for(let i=0; i<atmosCount*3; i++) {
        atmosPos[i] = (Math.random() - 0.5) * 50;
    }
    atmosGeo.setAttribute('position', new THREE.BufferAttribute(atmosPos, 3));
    const atmosMat = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x00D8FF,
        transparent: true,
        opacity: 0.15,
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
        // Adjust the '1000' here if the animation finishes too early/late in your scrolling
        let progress = Math.min(Math.max(scrollTop / 1000, 0), 1); 
        
        gsap.to(material.uniforms.uProgress, {
            value: progress,
            duration: 0.5,
            ease: 'power2.out'
        });
    });

    const clock = new THREE.Clock();

    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        material.uniforms.uTime.value = elapsedTime;

        // Give the entire object a slight tilt/pan based on mouse position
        particles.rotation.y += (mouseX * 0.15 - particles.rotation.y) * 0.05;
        particles.rotation.x += (-mouseY * 0.15 - particles.rotation.x) * 0.05;
        
        // Slowly spin the whole scene
        particles.rotation.y += 0.001;

        // Slowly move ambient dust
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
