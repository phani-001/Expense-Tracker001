import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShieldCheck, Zap } from 'lucide-react';
import { formatINR } from '../../lib/utils';

interface HeroHoloPortalProps {
  dailyBurnPaise?: number;
}

export function HeroHoloPortal({ dailyBurnPaise = 0 }: HeroHoloPortalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // 1. Mouse Tilt Tracking with spring damping
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let animId: number;

    const onPointerMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = nx * 12; // max tilt degrees
      targetY = ny * 12;
    };

    const updateTilt = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;
      setMouseTilt({ x: currentX, y: currentY });
      animId = requestAnimationFrame(updateTilt);
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    animId = requestAnimationFrame(updateTilt);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 2. Three.js Background Particle Vortex & Revolving Orbital Rings
  useEffect(() => {
    const mount = canvasRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 340;
    const height = mount.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    // Glowing Cyan Neon Torus Ring with Additive Blending
    const ring1Geo = new THREE.TorusGeometry(2.1, 0.028, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.set(Math.PI / 2.7, -0.25, 0);
    orbitGroup.add(ring1);

    // Orbiting Cyan Energy Bead
    const bead1Geo = new THREE.SphereGeometry(0.07, 16, 16);
    const bead1Mat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      blending: THREE.AdditiveBlending,
    });
    const bead1 = new THREE.Mesh(bead1Geo, bead1Mat);
    ring1.add(bead1);

    // Glowing Magenta Neon Torus Ring with Additive Blending
    const ring2Geo = new THREE.TorusGeometry(2.4, 0.022, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.set(-Math.PI / 3.2, 0.35, 0);
    orbitGroup.add(ring2);

    // Orbiting Magenta Energy Bead
    const bead2Geo = new THREE.SphereGeometry(0.06, 16, 16);
    const bead2Mat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      blending: THREE.AdditiveBlending,
    });
    const bead2 = new THREE.Mesh(bead2Geo, bead2Mat);
    ring2.add(bead2);

    // Stardust Particles with Additive Blending
    const pCount = 90;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 8;
      pPositions[i + 1] = (Math.random() - 0.5) * 7;
      pPositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Animation Loop
    let animReq: number;
    const startTime = performance.now();

    const render = () => {
      animReq = requestAnimationFrame(render);
      const t = (performance.now() - startTime) * 0.001;

      ring1.rotation.z += 0.008;
      ring2.rotation.z -= 0.006;

      // Animate travelling energy packets along the orbital paths
      bead1.position.set(Math.cos(t * 1.8) * 2.1, Math.sin(t * 1.8) * 2.1, 0);
      bead2.position.set(Math.cos(-t * 1.4) * 2.4, Math.sin(-t * 1.4) * 2.4, 0);

      particles.rotation.y = t * 0.02;

      renderer.render(scene, camera);
    };

    render();

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animReq);
      renderer.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      bead1Geo.dispose();
      bead1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      bead2Geo.dispose();
      bead2Mat.dispose();
      pGeo.dispose();
      pMat.dispose();
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[320px] sm:h-[350px] flex items-center justify-center select-none perspective-1000"
    >
      {/* ── Layer 1: Three.js WebGL Particle Vortex & Rings ── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-70"
      />

      {/* ── Ambient Radial Lighting Auras ── */}
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none transition-transform duration-700"
        style={{
          background: 'radial-gradient(circle, #06B6D4 0%, #7C3AED 70%, transparent 100%)',
          transform: `scale(${isHovered ? 1.3 : 1})`,
        }}
      />
      <div
        className="absolute w-44 h-44 rounded-full blur-2xl opacity-20 pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
        }}
      />

      {/* ── Layer 2: Main 3D Floating Stage with Multi-Plane Depth ── */}
      <div
        className="relative z-10 w-[240px] sm:w-[280px] flex flex-col items-center cursor-pointer transition-transform duration-100 ease-out preserve-3d"
        style={{
          transform: `rotateY(${mouseTilt.x.toFixed(2)}deg) rotateX(${(-mouseTilt.y).toFixed(2)}deg) scale(${isHovered ? 1.04 : 1})`,
        }}
      >
        {/* Continuous Levitation and Revolving Wobble */}
        <div className="w-full relative animate-revolve-3d preserve-3d flex items-center justify-center">
          {/* Master 3D Cyber-Wallet Artwork with Seamless Vignette Mask */}
          <div className="relative w-full overflow-visible flex items-center justify-center">
            <img
              src="/3d-wallet-hero.png"
              alt="SpendSense Quantum 3D Wallet"
              className="w-[280px] sm:w-[320px] max-w-none h-auto object-contain pointer-events-none drop-shadow-[0_20px_45px_rgba(6,182,212,0.4)]"
              style={{
                maskImage: 'radial-gradient(circle at 50% 50%, black 42%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.3) 66%, transparent 74%)',
                WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 42%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.3) 66%, transparent 74%)',
              }}
            />
          </div>

          {/* Floating Quantum Hologram Badge */}
          <div className="absolute bottom-1 right-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/40 text-[10px] font-bold text-cyan-300 backdrop-blur-md shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 depth-pop-md animate-pulse-glow">
            <ShieldCheck size={12} className="text-cyan-400" />
            <span className="tracking-wide">QUANTUM VAULT</span>
          </div>
        </div>

        {/* ── Grounding Floor Shadow with Breathing Scaling ── */}
        <div className="w-48 h-5 rounded-full bg-black/75 blur-md pointer-events-none -mt-4 animate-shadow-breathe" />

        {/* ── Layer 3: Interactive Circular Velocity Gauge ── */}
        <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl depth-pop-sm shadow-lg">
          <div className="relative w-4 h-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/10"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-cyan-400 stroke-current animate-gauge-glow"
                strokeWidth="4"
                strokeDasharray="85, 100"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <Zap size={8} className="absolute text-cyan-300" />
          </div>
          <span className="text-[11px] font-semibold text-slate-300 tracking-wider font-inter">
            {dailyBurnPaise > 0 ? `BURN • ${formatINR(dailyBurnPaise)}/day` : 'RUNWAY STABLE'}
          </span>
        </div>
      </div>
    </div>
  );
}
