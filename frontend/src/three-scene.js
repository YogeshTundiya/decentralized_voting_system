import * as THREE from 'three';
import gsap from 'gsap';

export function initThree(canvasId) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    // Deep Space background
    renderer.setClearColor(new THREE.Color('#020203')); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020203, 0.02); // Fog creates depth

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.z = 24; 

    // ==========================================
    // 1. GENERATE GEOMETRY STATES
    // ==========================================
    const particleCount = 20000; // Extremely high density for solid shapes
    const positions = new Float32Array(particleCount * 3);
    const chainPositions = new Float32Array(particleCount * 3);
    const wallPositions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);

    // Chain Parameters
    const numLinks = 10;
    const linkRadius = 2.5;
    const linkThickness = 0.6;
    const spacing = 3.6; // Distance between links

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // --- THE LONG CHAIN ---
        // Distribute particles evenly across the 10 links
        const linkIndex = i % numLinks; 
        
        // Math for a torus (ring)
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI * 2;
        
        let cx = (linkRadius + linkThickness * Math.cos(v)) * Math.cos(u);
        let cy = (linkRadius + linkThickness * Math.cos(v)) * Math.sin(u);
        let cz = linkThickness * Math.sin(v);

        // Interlock: Rotate every alternate ring by 90 degrees on the X axis
        if (linkIndex % 2 !== 0) {
            let temp = cy; cy = cz; cz = temp;
        }

        // Shift rings along the X-axis to form a long chain
        // Center the chain around 0
        const xOffset = (linkIndex - (numLinks / 2)) * spacing;
        cx += xOffset + 6; // +6 shifts the whole object slightly right of the UI

        chainPositions[i3] = cx;
        chainPositions[i3 + 1] = cy;
        chainPositions[i3 + 2] = cz;

        // --- THE PROPER WALL ---
        // Create a massive, dense grid of particles
        const wallWidth = 60;
        const wallHeight = 30;
        
        // Distribute particles randomly but densely on a plane
        let wx = (Math.random() - 0.5) * wallWidth;
        let wy = (Math.random() - 0.5) * wallHeight;
        
        // Make the wall curve backward at the edges (cylindrical curve)
        let wz = -(wx * wx) * 0.02 - 5; 

        wallPositions[i3] = wx;
        wallPositions[i3 + 1] = wy;
        wallPositions[i3 + 2] = wz;

        // Init starting pos
        positions[i3] = cx;
        positions[i3 + 1] = cy;
        positions[i3 + 2] = cz;

        sizes[i] = Math.random();
        randoms[i] = Math.random(); // Used for subtle twinkling
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aChainPos', new THREE.BufferAttribute(chainPositions, 3));
    geometry.setAttribute('aWallPos', new THREE.BufferAttribute(wallPositions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    // ==========================================
    // 2. SHADER MATERIAL (Includes Mouse Repulsion)
    // ==========================================
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uProgress: { value: 0 },
            uMouse3D: { value: new THREE.Vector3(999, 999, 999) }, // Pass 3D mouse coord
            uColor1: { value: new THREE.Color('#ffffff') }, 
            uColor2: { value: new THREE.Color('#00D8FF') } 
        },
        vertexShader: `
            uniform float uTime;
            uniform float uProgress;
            uniform vec3 uMouse3D;
            
            attribute vec3 aChainPos;
            attribute vec3 aWallPos;
            attribute float aSize;
            attribute float aRandom;
            
            varying float vSize;
            varying float vProgress;
            varying float vRandom;
            
            void main() {
                vProgress = uProgress;
                vRandom = aRandom;
                
                // Morphing
                vec3 targetPos = mix(aChainPos, aWallPos, uProgress);
                
                // MOUSE REPULSION LOGIC (Only particles move)
                float distToMouse = distance(targetPos, uMouse3D);
                float repelRadius = 6.0; // How big the cursor impact is
                
                vec3 repelOffset = vec3(0.0);
                if(distToMouse < repelRadius) {
                    // Calculate push force based on distance
                    float force = (repelRadius - distToMouse) / repelRadius;
                    // Push outward from mouse
                    vec3 dir = normalize(targetPos - uMouse3D);
                    // Add some chaos so it splatters nicely
                    repelOffset = dir * force * 3.0 * (aRandom + 0.5);
                }
                
                vec3 finalPos = targetPos + repelOffset;
                
                vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                gl_PointSize = (aSize * 3.5 + 1.0) * (25.0 / -mvPosition.z);
                vSize = aSize;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying float vSize;
            varying float vProgress;
            varying float vRandom;
            
            void main() {
                // Soft circle
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = (0.5 - dist) * 2.0;
                
                vec3 color = mix(uColor1, uColor2, vProgress);
                
                gl_FragColor = vec4(color, alpha * (vSize * 0.8 + 0.2));
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ==========================================
    // 3. SPACE ENVIRONMENT (Starfield)
    // ==========================================
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i < starCount * 3; i+=3) {
        // Scatter stars in a large sphere around the camera
        const radius = 60 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        
        starPos[i] = radius * Math.sin(phi) * Math.cos(theta);
        starPos[i+1] = radius * Math.sin(phi) * Math.sin(theta);
        starPos[i+2] = radius * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({
        size: 0.1, color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false
    });
    const starfield = new THREE.Points(starsGeo, starsMat);
    scene.add(starfield);

    // ==========================================
    // 4. INTERACTION & ANIMATION
    // ==========================================
    
    // Raycaster for exact 3D mouse mapping
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Invisible plane at Z=0
    const intersectPoint = new THREE.Vector3();

    document.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates
        mouse2D.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse2D.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Cast a ray from camera through mouse position
        raycaster.setFromCamera(mouse2D, camera);
        raycaster.ray.intersectPlane(plane, intersectPoint);
        
        // Send actual 3D collision point to shader
        material.uniforms.uMouse3D.value.copy(intersectPoint);
    });

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
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

        // Very slow, majestic rotation for the main objects
        particles.rotation.y = Math.sin(elapsedTime * 0.1) * 0.2;
        particles.rotation.x = Math.cos(elapsedTime * 0.1) * 0.1;
        
        // Slowly spin the starfield
        starfield.rotation.y = elapsedTime * 0.01;

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
