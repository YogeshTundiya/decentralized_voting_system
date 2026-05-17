import * as THREE from 'three';
import gsap from 'gsap';

export function initThree(canvasId) {
    const canvas = document.querySelector(canvasId);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    
    renderer.setClearColor(0x000000, 0); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.012);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
    camera.position.z = 28; 

    // ==========================================
    // 1. GENERATE GEOMETRY STATES
    // ==========================================
    const particleCount = 15000; 
    
    const positions = new Float32Array(particleCount * 3);
    const scatteredPositions = new Float32Array(particleCount * 3); 
    const chainPositions = new Float32Array(particleCount * 3);
    const corePositions = new Float32Array(particleCount * 3); 
    const wallPositions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    const colorA = new THREE.Color('#ff7b00'); // Orange
    const colorB = new THREE.Color('#00d2ff'); // Cyan
    const colorC = new THREE.Color('#9d00ff'); // Purple

    // --- 1. CHAIN MATH ---
    function getProperChainPos(linkIndex, totalLinks, scale, particleIndex) {
        const L = 3.2 * scale; 
        const R = 1.5 * scale; 
        const rBase = 0.55 * scale; 
        const pitch = L + R * 1.5; 

        const perimeter = 2 * L + 2 * Math.PI * R;
        let d = (particleIndex * 1.618 * perimeter) % perimeter;

        let sx, sy, nx, ny;
        if (d < L) { 
            sx = R; sy = -L/2 + d; nx = 1; ny = 0;
        } else if (d < L + Math.PI * R) { 
            let a = (d - L) / R; sx = R * Math.cos(a); sy = L/2 + R * Math.sin(a); nx = Math.cos(a); ny = Math.sin(a);
        } else if (d < 2*L + Math.PI * R) { 
            let d2 = d - (L + Math.PI * R); sx = -R; sy = L/2 - d2; nx = -1; ny = 0;
        } else { 
            let a = (d - (2*L + Math.PI * R)) / R; sx = -R * Math.cos(a); sy = -L/2 - R * Math.sin(a); nx = -Math.cos(a); ny = -Math.sin(a);
        }
        
        let v = (particleIndex * 2.399) % (Math.PI * 2); 
        let thickness = rBase * (0.6 + Math.random() * 0.4);

        let px = sx + nx * thickness * Math.cos(v);
        let py = sy + ny * thickness * Math.cos(v);
        let pz = thickness * Math.sin(v);

        if (linkIndex % 2 !== 0) {
            let temp = px; px = pz; pz = -temp;
        }

        py += (linkIndex - (totalLinks - 1) / 2) * pitch;
        return { x: px, y: py, z: pz };
    }

    // --- 2. CRYSTAL WIREFRAME MATH (Ultra Sharp!) ---
    // Define the 6 vertices of an Octahedron
    const scale = 1.3;
    const topV = new THREE.Vector3(0, 8*scale, 0);
    const botV = new THREE.Vector3(0, -8*scale, 0);
    const eq1 = new THREE.Vector3(5*scale, 0, 5*scale);
    const eq2 = new THREE.Vector3(5*scale, 0, -5*scale);
    const eq3 = new THREE.Vector3(-5*scale, 0, -5*scale);
    const eq4 = new THREE.Vector3(-5*scale, 0, 5*scale);

    // The 12 connecting edges
    const crystalEdges = [
        [topV, eq1], [topV, eq2], [topV, eq3], [topV, eq4],
        [botV, eq1], [botV, eq2], [botV, eq3], [botV, eq4],
        [eq1, eq2], [eq2, eq3], [eq3, eq4], [eq4, eq1]
    ];


    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // --- SCATTERED STATE ---
        scatteredPositions[i3] = (Math.random() - 0.5) * 200;
        scatteredPositions[i3 + 1] = (Math.random() - 0.5) * 200;
        scatteredPositions[i3 + 2] = (Math.random() - 0.5) * 100 - 20;

        // =====================================
        // SHAPE 1: THE CHAIN (Placed on RIGHT)
        // =====================================
        const pos = getProperChainPos(i % 6, 6, 1.2, i);
        const angleZ = -0.5; 
        let cx = pos.x * Math.cos(angleZ) - pos.y * Math.sin(angleZ) + 12.0; // +12 = Right Side
        let cy = pos.x * Math.sin(angleZ) + pos.y * Math.cos(angleZ) - 1.0;
        let cz = pos.z;

        chainPositions[i3] = cx;
        chainPositions[i3 + 1] = cy;
        chainPositions[i3 + 2] = cz;

        // =====================================
        // SHAPE 2: ETHEREUM CRYSTAL (Placed on LEFT)
        // =====================================
        // Map particles densely strictly to the lines between vertices
        const edge = crystalEdges[i % 12];
        const t = Math.random(); // Position along the line
        
        // Add a tiny random offset so it forms a crisp, thin glowing wire instead of a 1D pixel line
        const r1 = Math.random() * 0.4;
        const theta1 = Math.random() * Math.PI * 2;
        const phi1 = Math.acos(Math.random() * 2 - 1);
        const ox = r1 * Math.sin(phi1) * Math.cos(theta1);
        const oy = r1 * Math.sin(phi1) * Math.sin(theta1);
        const oz = r1 * Math.cos(phi1);

        // Position on LEFT side (-12.0)
        corePositions[i3] = edge[0].x + t * (edge[1].x - edge[0].x) + ox - 12.0; 
        corePositions[i3 + 1] = edge[0].y + t * (edge[1].y - edge[0].y) + oy;
        corePositions[i3 + 2] = edge[0].z + t * (edge[1].z - edge[0].z) + oz;

        // =====================================
        // SHAPE 3: SMALLER VAULT WALL (Placed on RIGHT)
        // =====================================
        const cols = 100; // Tighter grid
        const rows = 60;  // Shorter grid
        const c = i % cols;
        const r = Math.floor(i / cols);
        
        // Map to a tighter curved cylinder
        const thetaWall = (c / cols - 0.5) * Math.PI * 0.6; // Tighter arc
        const wy = (r / rows - 0.5) * 32; // Shorter height
        const radius = 18; // Tighter radius
        
        const wx = Math.sin(thetaWall) * radius + 12.0; // Position on RIGHT side (+12.0)
        const wz = Math.cos(thetaWall) * radius - 15.0; // Pushed back slightly less

        wallPositions[i3] = wx;
        wallPositions[i3 + 1] = wy;
        wallPositions[i3 + 2] = wz;

        // Intro start
        positions[i3] = scatteredPositions[i3];
        positions[i3 + 1] = scatteredPositions[i3 + 1];
        positions[i3 + 2] = scatteredPositions[i3 + 2];

        // Gradient Colors
        let colorMix;
        if (cy > 2) colorMix = colorB.clone().lerp(colorA, Math.random() * 0.5 + 0.5); 
        else if (cx < 12) colorMix = colorC.clone().lerp(colorB, Math.random() * 0.5 + 0.5); 
        else colorMix = colorA.clone().lerp(colorC, Math.random() * 0.5); 

        colors[i3] = colorMix.r;
        colors[i3 + 1] = colorMix.g;
        colors[i3 + 2] = colorMix.b;

        sizes[i] = 1.8 + Math.random(); 
        randoms[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScatteredPos', new THREE.BufferAttribute(scatteredPositions, 3));
    geometry.setAttribute('aChainPos', new THREE.BufferAttribute(chainPositions, 3));
    geometry.setAttribute('aCorePos', new THREE.BufferAttribute(corePositions, 3));
    geometry.setAttribute('aWallPos', new THREE.BufferAttribute(wallPositions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    // ==========================================
    // 2. SHADER MATERIAL (Handles the Screen-Crossing Math)
    // ==========================================
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uProgress: { value: 0 }, 
            uIntroProgress: { value: 0 },    
            uMouse3D: { value: new THREE.Vector3(999, 999, 999) },
            uMouseVel: { value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uProgress;
            uniform float uIntroProgress;
            uniform vec3 uMouse3D;
            uniform vec3 uMouseVel;
            
            attribute vec3 aScatteredPos;
            attribute vec3 aChainPos;
            attribute vec3 aCorePos;
            attribute vec3 aWallPos;
            attribute float aSize;
            attribute float aRandom;
            attribute vec3 aColor; 
            
            varying vec3 vColor;
            varying float vAlpha;
            
            mat3 rotateY(float angle) {
                float s = sin(angle), c = cos(angle);
                return mat3(c, 0.0, s,  0.0, 1.0, 0.0,  -s, 0.0, c);
            }
            
            void main() {
                vColor = aColor; 
                
                float phase1 = clamp(uProgress, 0.0, 1.0);       // Chain -> Crystal
                float phase2 = clamp(uProgress - 1.0, 0.0, 1.0); // Crystal -> Wall

                // 1. Spin the Objects locally
                // Chain is on Right (+12)
                vec3 localChain = aChainPos - vec3(12.0, 0.0, 0.0);
                vec3 animatedChain = rotateY(uTime * 0.1) * localChain + vec3(12.0, 0.0, 0.0);

                // Crystal is on Left (-12)
                vec3 localCore = aCorePos - vec3(-12.0, 0.0, 0.0);
                vec3 animatedCore = rotateY(uTime * -0.15) * localCore + vec3(-12.0, 0.0, 0.0);
                
                // 2. MORPHING LOGIC (They literally fly across the screen!)
                vec3 shape1 = mix(animatedChain, animatedCore, phase1);
                vec3 targetShape = mix(shape1, aWallPos, phase2);
                
                // 3. DOUBLE EXPLOSION MATH
                float explode1 = smoothstep(0.0, 0.5, phase1) * (1.0 - smoothstep(0.5, 1.0, phase1));
                float explode2 = smoothstep(0.0, 0.5, phase2) * (1.0 - smoothstep(0.5, 1.0, phase2));
                float totalExplode = explode1 + explode2;
                
                vec3 randDir = vec3(
                    fract(sin(aRandom * 12.9898) * 43758.5453),
                    fract(sin(aRandom * 39.346) * 43758.5453),
                    fract(sin(aRandom * 73.156) * 43758.5453)
                ) * 2.0 - 1.0;
                
                vec3 dislocation = normalize(randDir) * totalExplode * 40.0;
                targetShape += dislocation;

                // 4. Intro Assembly
                float individualProgress = smoothstep(aRandom * 0.2, 1.0, uIntroProgress);
                vec3 basePos = mix(aScatteredPos, targetShape, individualProgress);
                
                // 5. Mouse Magnetic Hover
                float distToMouse = distance(basePos, uMouse3D);
                float influenceRadius = 5.0;
                float disturbance = 0.0;
                vec3 offset = vec3(0.0);
                
                if (distToMouse < influenceRadius && totalExplode < 0.05) {
                    disturbance = pow(1.0 - (distToMouse / influenceRadius), 2.0);
                    vec3 dirFromMouse = normalize(basePos - uMouse3D);
                    offset = (dirFromMouse * (2.0 + aRandom * 3.0) + uMouseVel * 2.0) * disturbance;
                }
                
                vec3 finalPos = basePos + offset;
                vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                gl_PointSize = aSize * (35.0 / -mvPosition.z);
                
                float twinkle = 1.0;
                if (phase2 > 0.9) {
                    twinkle = sin(uTime * 4.0 + aRandom * 50.0) * 0.3 + 0.7;
                }

                vAlpha = (1.0 - (disturbance * 0.4)) * uIntroProgress * twinkle;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard; 
                gl_FragColor = vec4(vColor, vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ==========================================
    // 3. INTRO ANIMATION & STARS
    // ==========================================
    gsap.to(material.uniforms.uIntroProgress, { value: 1.0, duration: 3.5, ease: "power3.inOut", delay: 0.2 });

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i < starCount * 3; i+=3) {
        const radius = 40 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        starPos[i] = radius * Math.sin(phi) * Math.cos(theta);
        starPos[i+1] = radius * Math.sin(phi) * Math.sin(theta);
        starPos[i+2] = radius * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({ size: 0.1, color: 0x8888aa, transparent: true, opacity: 0.3, depthWrite: false });
    const starfield = new THREE.Points(starsGeo, starsMat);
    scene.add(starfield);

    // ==========================================
    // 4. SCROLL & MOUSE LOGIC
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); 
    const intersectPoint = new THREE.Vector3();
    const targetIntersect = new THREE.Vector3(999, 999, 999);
    
    let lastMousePos = new THREE.Vector3();
    const mouseVelocity = new THREE.Vector3();

    document.addEventListener('mousemove', (event) => {
        mouse2D.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse2D.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse2D, camera);
        raycaster.ray.intersectPlane(plane, targetIntersect);
    });

    window.addEventListener('scroll', () => {
        const techSection = document.getElementById('technology');
        const portalSection = document.getElementById('voterPortal');
        
        if (!techSection || !portalSection) return;

        const offset = window.innerHeight * 0.5;
        const scrollY = window.scrollY + offset;
        const techTop = techSection.offsetTop;
        const portalTop = portalSection.offsetTop;

        let progress = 0;
        if (scrollY < techTop) {
            progress = Math.max(0, scrollY / techTop);
        } else if (scrollY < portalTop) {
            progress = 1.0 + ((scrollY - techTop) / (portalTop - techTop));
        } else {
            progress = 2.0;
        }

        progress = Math.min(Math.max(progress, 0.0), 2.0);

        gsap.to(material.uniforms.uProgress, {
            value: progress, duration: 0.8, ease: 'power2.out'
        });
    });

    const clock = new THREE.Clock();

    const animate = () => {
        const elapsedTime = clock.getElapsedTime();
        material.uniforms.uTime.value = elapsedTime;

        intersectPoint.lerp(targetIntersect, 0.15);
        material.uniforms.uMouse3D.value.copy(intersectPoint);
        mouseVelocity.subVectors(intersectPoint, lastMousePos);
        material.uniforms.uMouseVel.value.lerp(mouseVelocity, 0.1);
        lastMousePos.copy(intersectPoint);

        camera.position.x = Math.sin(elapsedTime * 0.2) * 1.5;
        camera.position.y = Math.cos(elapsedTime * 0.1) * 1.0;
        camera.lookAt(scene.position);
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
