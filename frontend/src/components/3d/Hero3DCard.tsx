import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ShieldCheck } from 'lucide-react';
import { formatINR } from '../../lib/utils';

interface Hero3DCardProps {
  dailyBurnPaise?: number;
}

// ─── High-Resolution Procedural Textures ──────────────────────────

/** Generate Front Face Texture for SpendSense Titanium Card (2048x1290) */
function createCardFrontTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 645; // ~1.586 standard card aspect ratio
  const ctx = canvas.getContext('2d')!;

  // 1. Titanium Obsidian Gradient Base with High Contrast
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 645);
  bgGrad.addColorStop(0, '#161933');
  bgGrad.addColorStop(0.35, '#1e2246');
  bgGrad.addColorStop(0.7, '#13152c');
  bgGrad.addColorStop(1, '#221940');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 645);

  // 2. Radiant Holographic Foil Sheen
  const sheenGrad = ctx.createLinearGradient(80, 0, 940, 645);
  sheenGrad.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
  sheenGrad.addColorStop(0.35, 'rgba(124, 58, 237, 0.32)');
  sheenGrad.addColorStop(0.7, 'rgba(236, 72, 153, 0.22)');
  sheenGrad.addColorStop(1, 'rgba(6, 182, 212, 0.15)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 0, 1024, 645);

  // 3. Futuristic Geometric Cyber Circuit Lines
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.lineTo(340, 180);
  ctx.lineTo(440, 280);
  ctx.lineTo(1024, 280);
  ctx.moveTo(180, 645);
  ctx.lineTo(380, 445);
  ctx.lineTo(1024, 445);
  ctx.stroke();

  // 4. Double Chamfered Border with Neon Cyan Sheen
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 988, 609);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 26, 972, 593);

  // 5. Polished Gold EMV Microchip (Left Side)
  const chipX = 90;
  const chipY = 220;
  const chipW = 145;
  const chipH = 115;

  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH);
  chipGrad.addColorStop(0, '#fffbeb');
  chipGrad.addColorStop(0.25, '#fde047');
  chipGrad.addColorStop(0.65, '#f59e0b');
  chipGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = chipGrad;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, 16);
  ctx.fill();

  // Chip Circuit Lines
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  // Horizontal split
  ctx.moveTo(chipX, chipY + chipH / 2);
  ctx.lineTo(chipX + chipW, chipY + chipH / 2);
  // Vertical micro-lines
  ctx.moveTo(chipX + chipW * 0.35, chipY);
  ctx.lineTo(chipX + chipW * 0.35, chipY + chipH);
  ctx.moveTo(chipX + chipW * 0.65, chipY);
  ctx.lineTo(chipX + chipW * 0.65, chipY + chipH);
  ctx.stroke();

  // Chip Center Core
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.roundRect(chipX + chipW * 0.38, chipY + chipH * 0.3, chipW * 0.24, chipH * 0.4, 4);
  ctx.fill();

  // 6. Contactless Wave Indicator
  const waveX = 265;
  const waveY = 275;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (let r = 16; r <= 36; r += 10) {
    ctx.beginPath();
    ctx.arc(waveX, waveY, r, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }

  // 7. SpendSense Hologram Logo (Top Left)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Outfit, sans-serif';
  ctx.fillText('Spend', 90, 110);
  const spendWidth = ctx.measureText('Spend').width;

  const textGrad = ctx.createLinearGradient(90 + spendWidth, 110, 90 + spendWidth + 120, 110);
  textGrad.addColorStop(0, '#06b6d4');
  textGrad.addColorStop(0.5, '#a855f7');
  textGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = textGrad;
  ctx.fillText('Sense', 90 + spendWidth, 110);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.font = 'bold 15px Inter, sans-serif';
  ctx.letterSpacing = '5px';
  ctx.fillText('TITANIUM WEALTH', 90, 142);
  ctx.letterSpacing = '0px';

  // 8. Card Number (Masked)
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 36px "Courier New", monospace';
  ctx.fillText('••••   ••••   ••••   8824', 90, 430);

  // 9. Cardholder Name & Expiry
  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.font = '600 13px Inter, sans-serif';
  ctx.fillText('CARDHOLDER', 90, 520);
  ctx.fillText('EXPIRES', 420, 520);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillText('ENTERPRISE CLIENT', 90, 555);
  ctx.fillText('09/29', 420, 555);

  // 10. Dual Hologram Rings (Bottom Right - Mastercard style)
  const holoX = 870;
  const holoY = 530;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.beginPath();
  ctx.arc(holoX - 26, holoY, 44, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.beginPath();
  ctx.arc(holoX + 26, holoY, 44, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** Generate Back Face Texture for SpendSense Card (2048x1290) */
function createCardBackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 645;
  const ctx = canvas.getContext('2d')!;

  // Dark Titanium Background
  ctx.fillStyle = '#0a0b16';
  ctx.fillRect(0, 0, 1024, 645);

  // Magnetic Stripe
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 70, 1024, 115);

  // Signature Strip
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(90, 260, 620, 75);

  // Micro Security Watermark inside Signature Strip
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  for (let y = 280; y < 330; y += 16) {
    ctx.fillText('SPENDSENSE VERIFIED • 256-BIT ENCRYPTED • SECURE VAULT', 105, y);
  }

  // CVV Box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(720, 260, 120, 75);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic bold 28px "Courier New", monospace';
  ctx.fillText('942', 750, 310);

  // Hologram Security Emblem
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(910, 300, 32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SECURE', 910, 304);

  // Legal Notice
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.font = '13px Inter, sans-serif';
  ctx.fillText('Authorized signature not transferrable. Issued by SpendSense Financial Technologies.', 90, 420);
  ctx.fillText('For 24/7 dedicated enterprise concierge support, visit spendsense.io/vault', 90, 450);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

/** Generate High-Resolution Minted Gold Indian Rupee (₹) Coin Texture */
function createGoldCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich Metallic Gold Radial Gradient
  const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
  grad.addColorStop(0, '#fffbeb');
  grad.addColorStop(0.25, '#fde047');
  grad.addColorStop(0.6, '#f59e0b');
  grad.addColorStop(0.85, '#d97706');
  grad.addColorStop(1, '#92400e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.fill();

  // 2. Beveled Coin Rim
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Serrated Outer Teeth
  ctx.fillStyle = '#b45309';
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const x = 256 + Math.cos(angle) * 228;
    const y = 256 + Math.sin(angle) * 228;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Inner Ring Groove
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 195, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Embossed Indian Rupee (₹) Glyph with Dimensional Shadow
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 240px "Outfit", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₹', 262, 268);

  ctx.fillStyle = '#fffbeb';
  ctx.fillText('₹', 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  return texture;
}

// ─── Main 3D Revolving Card Component ─────────────────────────────

export function Hero3DCard({ dailyBurnPaise = 0 }: Hero3DCardProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Dimensions & Scene Setup
    let width = container.clientWidth || 360;
    let height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 4.25);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Studio Lighting Rig
    const ambientLight = new THREE.AmbientLight(0x2d3159, 2.2);
    scene.add(ambientLight);

    // Directional Key Light (Top-Left)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-3.5, 4.5, 4.5);
    scene.add(keyLight);

    // Cyan Rim Light (Right-Back)
    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 3.5);
    cyanRim.position.set(4.5, 2, -2.5);
    scene.add(cyanRim);

    // Violet Edge Light (Bottom-Left)
    const violetRim = new THREE.DirectionalLight(0xec4899, 2.6);
    violetRim.position.set(-3, -3.5, 2);
    scene.add(violetRim);

    // Pointer-Following Dynamic Specular Glint Light
    const pointerLight = new THREE.PointLight(0xffffff, 0.8, 8);
    pointerLight.position.set(0, 0, 3);
    scene.add(pointerLight);

    // Dynamic Theme Lighting Adjustment
    const updateThemeLighting = () => {
      const isLight = document.documentElement.classList.contains('light');
      if (isLight) {
        ambientLight.color.setHex(0xdbeafe);
        ambientLight.intensity = 2.6;
        keyLight.intensity = 3.6;
        cyanRim.intensity = 2.8;
        violetRim.intensity = 2.2;
      } else {
        ambientLight.color.setHex(0x2d3159);
        ambientLight.intensity = 2.2;
        keyLight.intensity = 3.4;
        cyanRim.intensity = 3.5;
        violetRim.intensity = 2.6;
      }
    };
    updateThemeLighting();
    window.addEventListener('spendsense-theme-change', updateThemeLighting);

    // 3. Master Card Group
    const masterGroup = new THREE.Group();
    masterGroup.rotation.set(0.12, -0.28, 0.04);
    scene.add(masterGroup);

    // 4. Create Rounded Extruded Credit Card Geometry (Titanium Chassis)
    const cardW = 2.65;
    const cardH = 1.68;
    const radius = 0.12;

    const cardShape = new THREE.Shape();
    cardShape.moveTo(-cardW / 2 + radius, -cardH / 2);
    cardShape.lineTo(cardW / 2 - radius, -cardH / 2);
    cardShape.quadraticCurveTo(cardW / 2, -cardH / 2, cardW / 2, -cardH / 2 + radius);
    cardShape.lineTo(cardW / 2, cardH / 2 - radius);
    cardShape.quadraticCurveTo(cardW / 2, cardH / 2, cardW / 2 - radius, cardH / 2);
    cardShape.lineTo(-cardW / 2 + radius, cardH / 2);
    cardShape.quadraticCurveTo(-cardW / 2, cardH / 2, -cardW / 2, cardH / 2 - radius);
    cardShape.lineTo(-cardW / 2, -cardH / 2 + radius);
    cardShape.quadraticCurveTo(-cardW / 2, -cardH / 2, -cardW / 2 + radius, -cardH / 2);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    };

    const cardGeo = new THREE.ExtrudeGeometry(cardShape, extrudeSettings);
    cardGeo.center();

    // Textures
    const frontTex = createCardFrontTexture();
    const backTex = createCardBackTexture();

    // High-End Titanium Physical Materials
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.95,
      roughness: 0.2,
      clearcoat: 0.8,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      metalness: 0.4,
      roughness: 0.35,
    });

    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      metalness: 0.4,
      roughness: 0.35,
    });

    // Extruded card chassis with titanium edge bevel
    const cardMesh = new THREE.Mesh(cardGeo, edgeMat);
    masterGroup.add(cardMesh);

    // Front face plane sitting precisely on the front bevel edge
    const frontPlaneGeo = new THREE.PlaneGeometry(cardW - 0.03, cardH - 0.03);
    const frontPlaneMesh = new THREE.Mesh(frontPlaneGeo, frontMat);
    frontPlaneMesh.position.z = 0.038;
    masterGroup.add(frontPlaneMesh);

    // Back cover plane sitting precisely on the back bevel edge
    const backPlaneGeo = new THREE.PlaneGeometry(cardW - 0.03, cardH - 0.03);
    const backPlaneMesh = new THREE.Mesh(backPlaneGeo, backMat);
    backPlaneMesh.rotation.y = Math.PI;
    backPlaneMesh.position.z = -0.038;
    masterGroup.add(backPlaneMesh);

    // 5. Minted 3D Gold Rupee Coins (Balanced around card frame)
    const coinTex = createGoldCoinTexture();
    const coinMat = new THREE.MeshStandardMaterial({
      map: coinTex,
      color: 0xffd700,
      metalness: 0.92,
      roughness: 0.18,
    });
    const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);

    // Coin 1 (Top-Right Floating)
    const coin1 = new THREE.Mesh(coinGeo, coinMat);
    coin1.rotation.set(Math.PI / 3, 0.3, 0.2);
    coin1.position.set(1.32, 0.62, 0.45);
    scene.add(coin1);

    // Coin 2 (Bottom-Left Foreground)
    const coin2 = new THREE.Mesh(coinGeo, coinMat);
    coin2.rotation.set(Math.PI / 2.6, -0.4, 0.5);
    coin2.position.set(-1.3, -0.52, 0.55);
    scene.add(coin2);

    // Coin 3 (Bottom-Right Floating Depth)
    const coin3 = new THREE.Mesh(coinGeo, coinMat);
    coin3.rotation.set(Math.PI / 3.5, 0.5, -0.3);
    coin3.position.set(1.05, -0.72, 0.38);
    scene.add(coin3);

    // 6. Subtle Floating Dust Particles
    const pCount = 45;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 7;
      pPositions[i + 1] = (Math.random() - 0.5) * 5;
      pPositions[i + 2] = (Math.random() - 0.5) * 3;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // 7. Ground Drop Shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const shadowGrad = sCtx.createRadialGradient(128, 64, 10, 128, 64, 120);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    shadowGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
    shadowGrad.addColorStop(1, 'transparent');
    sCtx.fillStyle = shadowGrad;
    sCtx.fillRect(0, 0, 256, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.5, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -1.6, 0);
    scene.add(shadowMesh);

    // 8. Animation & Parallax Loop
    let animId: number;
    const startTime = performance.now();
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetTiltX = nx * 0.35;
      targetTiltY = ny * 0.35;
      pointerLight.position.x = nx * 3;
      pointerLight.position.y = ny * 2;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    const render = () => {
      animId = requestAnimationFrame(render);
      const t = (performance.now() - startTime) * 0.001;

      // Smooth gyro tilt interpolation
      currentTiltX += (targetTiltX - currentTiltX) * 0.06;
      currentTiltY += (targetTiltY - currentTiltY) * 0.06;

      // Card 3D Revolving Motion: continuous gentle 360 rotation on Y + hovering bob
      masterGroup.rotation.y += 0.008;
      masterGroup.rotation.x = currentTiltY + Math.sin(t * 1.2) * 0.06;
      masterGroup.rotation.z = currentTiltX * 0.5 + Math.cos(t * 1.0) * 0.03;
      masterGroup.position.y = Math.sin(t * 1.5) * 0.08;

      // Coin 1 orbiting float
      coin1.position.y = 0.75 + Math.sin(t * 1.8 + 1) * 0.08;
      coin1.rotation.y += 0.015;
      coin1.rotation.x = Math.PI / 3 + Math.sin(t * 1.4) * 0.08;

      // Coin 2 orbiting float
      coin2.position.y = -0.65 + Math.sin(t * 1.6 + 2) * 0.08;
      coin2.rotation.y -= 0.012;
      coin2.rotation.z += 0.01;

      // Coin 3 orbiting float
      coin3.position.y = -0.85 + Math.sin(t * 1.5 + 3.2) * 0.07;
      coin3.rotation.y += 0.014;
      coin3.rotation.x = Math.PI / 3.5 + Math.sin(t * 1.3) * 0.06;

      // Floor shadow breathing
      shadowMesh.scale.set(1 + Math.sin(t * 1.5) * 0.08, 1 + Math.sin(t * 1.5) * 0.08, 1);

      // Dust particle drift
      particles.rotation.y = t * 0.02;

      renderer.render(scene, camera);
    };

    render();

    // Responsive Canvas Resizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('spendsense-theme-change', updateThemeLighting);
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
      renderer.dispose();
      cardGeo.dispose();
      frontPlaneGeo.dispose();
      backPlaneGeo.dispose();
      frontMat.dispose();
      backMat.dispose();
      edgeMat.dispose();
      coinGeo.dispose();
      coinMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      frontTex.dispose();
      backTex.dispose();
      coinTex.dispose();
      shadowTex.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-[320px] sm:h-[350px] flex flex-col items-center justify-center select-none transition-transform duration-500 ${
        isHovered ? 'scale-[1.02]' : 'scale-100'
      }`}
    >
      {/* Dynamic Runway Velocity Pill Overlay */}
      <div className="absolute bottom-2 z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 dark:bg-slate-950/70 border border-slate-700/50 dark:border-white/10 backdrop-blur-xl shadow-lg transition-transform duration-300 hover:scale-105">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-slate-200 dark:text-slate-300 tracking-wider font-inter">
          {dailyBurnPaise > 0 ? `BURN • ${formatINR(dailyBurnPaise)}/day` : 'TITANIUM VAULT • 256-BIT'}
        </span>
        <div className="w-px h-3 bg-white/15" />
        <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400">
          <ShieldCheck size={12} />
          <span>ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
