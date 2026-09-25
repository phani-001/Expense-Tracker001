import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Texture Helpers ──────────────────────────────────────────

/** Procedural Canvas Texture for Golden Rupee Coin */
function createCoinTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Gold radial gradient
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.4, '#f59e0b');
  grad.addColorStop(0.85, '#b45309');
  grad.addColorStop(1, '#78350f');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  // Inner border rim
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  // Rupee symbol shadow
  ctx.fillStyle = '#78350f';
  ctx.font = 'bold 120px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('₹', 130, 134);

  // Rupee symbol front
  ctx.fillStyle = '#fffbeb';
  ctx.fillText('₹', 126, 128);

  return new THREE.CanvasTexture(canvas);
}

/** Procedural Canvas Texture for Itemized Grocery Receipt */
function createReceiptTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Crisp White Paper Base
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 512);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Grocery', 128, 50);

  ctx.font = 'bold 26px Outfit, sans-serif';
  ctx.fillStyle = '#7c3aed';
  ctx.fillText('₹ 245.00', 128, 85);

  // Dotted divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(24, 110);
  ctx.lineTo(232, 110);
  ctx.stroke();

  // Item lines
  ctx.setLineDash([]);
  ctx.textAlign = 'left';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillStyle = '#334155';

  const items = [
    { name: 'Snacks', price: '₹ 120.00' },
    { name: 'Milk', price: '₹ 60.00' },
    { name: 'Fruits', price: '₹ 65.00' },
  ];

  let y = 145;
  items.forEach((item) => {
    ctx.fillText(item.name, 28, y);
    ctx.textAlign = 'right';
    ctx.fillText(item.price, 228, y);
    ctx.textAlign = 'left';
    y += 34;
  });

  // Second divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(24, 260);
  ctx.lineTo(232, 260);
  ctx.stroke();

  // Barcode stripes
  ctx.setLineDash([]);
  ctx.fillStyle = '#475569';
  for (let x = 32; x < 224; x += 6) {
    const barW = x % 12 === 0 ? 4 : 2;
    ctx.fillRect(x, 290, barW, 45);
  }

  return new THREE.CanvasTexture(canvas);
}

/** Procedural Canvas Texture for Glowing Credit Card */
function createCardTexture(
  color1: string,
  color2: string,
  label: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  // Card gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 160);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 152, 14);
  ctx.fill();

  // Subtle border glow
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Microchip
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.roundRect(26, 48, 42, 32, 5);
  ctx.fill();

  // Contactless waves
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(88, 64, 10, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(88, 64, 16, -Math.PI / 3, Math.PI / 3);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px Outfit, sans-serif';
  ctx.fillText(label, 26, 126);

  // Mastercard circles
  ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.beginPath();
  ctx.arc(196, 118, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.beginPath();
  ctx.arc(216, 118, 14, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

// ─── Main 3D Scene Component ──────────────────────────────────

export function Hero3DWallet() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const width = container.clientWidth || 340;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.2, 6.2);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Master 3D Group (Contains all wallet, orbit, and coin elements)
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // ─── Procedural Textures ──────────────────────────────────
    const coinTexture = createCoinTexture();
    const receiptTexture = createReceiptTexture();
    const card1Texture = createCardTexture('#311042', '#6b21a8', 'SpendSense');
    const card2Texture = createCardTexture('#0e7490', '#06b6d4', 'Platinum');

    // ─── A. Central 3D Wallet ─────────────────────────────────
    const walletGroup = new THREE.Group();
    masterGroup.add(walletGroup);

    // Leather Body Base
    const walletMat = new THREE.MeshStandardMaterial({
      color: 0x1b1c31,
      roughness: 0.35,
      metalness: 0.2,
    });
    const bodyGeo = new THREE.BoxGeometry(2.1, 1.5, 0.45);
    const bodyMesh = new THREE.Mesh(bodyGeo, walletMat);
    bodyMesh.castShadow = true;
    walletGroup.add(bodyMesh);

    // Front Flap / Pocket
    const frontPocketGeo = new THREE.BoxGeometry(2.02, 1.25, 0.25);
    const frontPocketMesh = new THREE.Mesh(frontPocketGeo, walletMat);
    frontPocketMesh.position.set(0, -0.1, 0.22);
    walletGroup.add(frontPocketMesh);

    // Leather Strap with Snap Button
    const strapGeo = new THREE.BoxGeometry(0.55, 0.32, 0.32);
    const strapMesh = new THREE.Mesh(strapGeo, walletMat);
    strapMesh.position.set(0.55, -0.05, 0.32);
    walletGroup.add(strapMesh);

    // Chrome Button
    const buttonGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24);
    const buttonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12,
    });
    const buttonMesh = new THREE.Mesh(buttonGeo, buttonMat);
    buttonMesh.rotation.x = Math.PI / 2;
    buttonMesh.position.set(0.55, -0.05, 0.48);
    walletGroup.add(buttonMesh);

    // Glowing Chevron Logo on Wallet Front
    const chevronGeo = new THREE.ConeGeometry(0.12, 0.2, 3);
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
    chevronMesh.position.set(-0.55, -0.18, 0.36);
    chevronMesh.rotation.z = Math.PI;
    walletGroup.add(chevronMesh);

    // ─── B. Credit Cards inside Wallet ────────────────────────
    // Card 1 (Violet)
    const cardMat1 = new THREE.MeshStandardMaterial({
      map: card1Texture,
      roughness: 0.25,
      metalness: 0.4,
    });
    const cardGeo1 = new THREE.BoxGeometry(1.65, 1.05, 0.025);
    const cardMesh1 = new THREE.Mesh(cardGeo1, cardMat1);
    cardMesh1.position.set(-0.08, 0.72, 0.08);
    cardMesh1.rotation.z = -0.12;
    walletGroup.add(cardMesh1);

    // Card 2 (Cyan)
    const cardMat2 = new THREE.MeshStandardMaterial({
      map: card2Texture,
      roughness: 0.25,
      metalness: 0.4,
    });
    const cardGeo2 = new THREE.BoxGeometry(1.65, 1.05, 0.025);
    const cardMesh2 = new THREE.Mesh(cardGeo2, cardMat2);
    cardMesh2.position.set(0.12, 0.82, -0.05);
    cardMesh2.rotation.z = 0.08;
    walletGroup.add(cardMesh2);

    // ─── C. Curved Unfurling Grocery Receipt ───────────────────
    const receiptGeo = new THREE.PlaneGeometry(1.15, 3.0, 1, 36);
    // Deform plane along an S-curve like authentic receipt paper
    const posAttr = receiptGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const zOffset = Math.sin(y * 1.6) * 0.45;
      posAttr.setZ(i, zOffset);
    }
    receiptGeo.computeVertexNormals();

    const receiptMat = new THREE.MeshStandardMaterial({
      map: receiptTexture,
      side: THREE.DoubleSide,
      roughness: 0.65,
    });
    const receiptMesh = new THREE.Mesh(receiptGeo, receiptMat);
    receiptMesh.position.set(0.68, 0.85, -0.25);
    receiptMesh.rotation.z = 0.18;
    receiptMesh.rotation.y = -0.15;
    walletGroup.add(receiptMesh);

    // ─── D. Floating Credit Card (Orbiting on Left) ───────────
    const floatCardGroup = new THREE.Group();
    masterGroup.add(floatCardGroup);
    const floatCardGeo = new THREE.BoxGeometry(1.25, 0.78, 0.02);
    const floatCardMat = new THREE.MeshStandardMaterial({
      map: card1Texture,
      roughness: 0.2,
      metalness: 0.6,
    });
    const floatCardMesh = new THREE.Mesh(floatCardGeo, floatCardMat);
    floatCardMesh.position.set(-2.0, -0.3, 0.8);
    floatCardMesh.rotation.set(0.3, 0.4, -0.2);
    floatCardGroup.add(floatCardMesh);

    // ─── E. Genuine 3D Golden Rupee Coins ─────────────────────
    const coinSideMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.2,
    });
    const coinFaceMat = new THREE.MeshStandardMaterial({
      map: coinTexture,
      metalness: 0.9,
      roughness: 0.25,
    });
    const coinMaterials = [coinSideMat, coinFaceMat, coinFaceMat];

    const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.065, 32);

    interface CoinData {
      mesh: THREE.Mesh;
      angle: number;
      speed: number;
      radiusX: number;
      radiusZ: number;
      baseY: number;
      rotSpeedX: number;
      rotSpeedY: number;
    }

    const coins: CoinData[] = [];
    const coinConfigs = [
      { radiusX: 2.1, radiusZ: 1.5, baseY: 1.2, speed: 0.8, startAngle: 0.5 },
      { radiusX: 2.4, radiusZ: 1.7, baseY: -0.9, speed: 0.7, startAngle: 2.2 },
      { radiusX: 1.9, radiusZ: 1.3, baseY: -0.7, speed: 0.9, startAngle: 4.1 },
      { radiusX: 2.3, radiusZ: 1.6, baseY: 0.2, speed: 0.65, startAngle: 5.4 },
    ];

    coinConfigs.forEach((cfg) => {
      const mesh = new THREE.Mesh(coinGeo, coinMaterials);
      mesh.castShadow = true;
      masterGroup.add(mesh);
      coins.push({
        mesh,
        angle: cfg.startAngle,
        speed: cfg.speed,
        radiusX: cfg.radiusX,
        radiusZ: cfg.radiusZ,
        baseY: cfg.baseY,
        rotSpeedX: 0.02 + Math.random() * 0.02,
        rotSpeedY: 0.03 + Math.random() * 0.02,
      });
    });

    // ─── F. Animated Glowing Orbit Rings ──────────────────────
    // Ring 1 (Cyan Neon Ring)
    const ring1Geo = new THREE.TorusGeometry(2.35, 0.025, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.set(Math.PI / 2.8, -0.3, 0);
    masterGroup.add(ring1);

    // Ring 2 (Violet / Pink Neon Ring)
    const ring2Geo = new THREE.TorusGeometry(2.65, 0.02, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.75,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.set(-Math.PI / 3.2, 0.35, 0);
    masterGroup.add(ring2);

    // Sparkling 3D Star on Ring 1
    const starGeo = new THREE.OctahedronGeometry(0.08, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    masterGroup.add(starMesh);

    // ─── G. Floating Dust Stardust Particles ──────────────────
    const pCount = 80;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 8;
      pPositions[i + 1] = (Math.random() - 0.5) * 7;
      pPositions[i + 2] = (Math.random() - 0.5) * 5;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xa78bfa,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ─── H. Studio Lighting ───────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    // Key Light (Cyan)
    const keyLight = new THREE.DirectionalLight(0x67e8f9, 2.2);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    // Rim Light (Violet/Purple)
    const rimLight = new THREE.PointLight(0xa855f7, 3.5, 12);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    // Accent Gold Light
    const goldLight = new THREE.PointLight(0xf59e0b, 2.2, 10);
    goldLight.position.set(2, -2, 3);
    scene.add(goldLight);

    // ─── I. Interactive Mouse Tracking ────────────────────────
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isVisible = true;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = nx * 0.45;
      targetRotX = -ny * 0.45;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(container);

    // ─── J. Animation & Physics Loop ──────────────────────────
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      const t = (performance.now() - startTime) * 0.001;

      // 1. Organic Floating & Revolving for Central Wallet
      walletGroup.position.y = Math.sin(t * 1.5) * 0.12;
      walletGroup.rotation.y = Math.sin(t * 0.8) * 0.22;
      walletGroup.rotation.x = Math.cos(t * 1.2) * 0.06;

      // 2. Continuous Orbit Ring Revolving
      ring1.rotation.z += 0.007;
      ring2.rotation.z -= 0.005;

      // Star follows Ring 1
      const starAngle = t * 0.9;
      starMesh.position.set(
        Math.cos(starAngle) * 2.35,
        Math.sin(starAngle) * 1.0,
        Math.sin(starAngle) * 1.8,
      );
      starMesh.rotation.x += 0.05;
      starMesh.rotation.y += 0.05;

      // 3. Floating Credit Card Levitation
      floatCardMesh.position.y = -0.3 + Math.sin(t * 1.8 + 1) * 0.15;
      floatCardMesh.rotation.y = 0.4 + Math.cos(t * 1.1) * 0.15;

      // 4. Gold Coins 3D Orbital Physics
      coins.forEach((c) => {
        c.angle += 0.012 * c.speed;
        c.mesh.position.x = Math.cos(c.angle) * c.radiusX;
        c.mesh.position.z = Math.sin(c.angle) * c.radiusZ;
        c.mesh.position.y = c.baseY + Math.sin(t * 2 + c.angle) * 0.14;

        c.mesh.rotation.x += c.rotSpeedX;
        c.mesh.rotation.y += c.rotSpeedY;
      });

      // 5. Stardust Gentle Orbit
      particles.rotation.y = t * 0.02;

      // 6. Smooth Mouse Tilt Interpolation (lerp)
      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;
      masterGroup.rotation.x = currentRotX;
      masterGroup.rotation.y = currentRotY;

      renderer.render(scene, camera);
    };

    animate();

    // ─── K. Resize Handler ────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // ─── Cleanup ──────────────────────────────────────────────
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      cancelAnimationFrame(animId);

      renderer.dispose();
      bodyGeo.dispose();
      frontPocketGeo.dispose();
      strapGeo.dispose();
      buttonGeo.dispose();
      chevronGeo.dispose();
      cardGeo1.dispose();
      cardGeo2.dispose();
      receiptGeo.dispose();
      floatCardGeo.dispose();
      coinGeo.dispose();
      ring1Geo.dispose();
      ring2Geo.dispose();
      starGeo.dispose();
      pGeo.dispose();

      walletMat.dispose();
      buttonMat.dispose();
      chevronMat.dispose();
      cardMat1.dispose();
      cardMat2.dispose();
      receiptMat.dispose();
      floatCardMat.dispose();
      coinSideMat.dispose();
      coinFaceMat.dispose();
      ring1Mat.dispose();
      ring2Mat.dispose();
      starMat.dispose();
      pMat.dispose();

      coinTexture.dispose();
      receiptTexture.dispose();
      card1Texture.dispose();
      card2Texture.dispose();

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[300px] md:h-[340px] flex items-center justify-center select-none">
      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Atmospheric Background Auras */}
      <div
        className="absolute w-52 h-52 rounded-full blur-3xl opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #06B6D4 0%, #7C3AED 70%, transparent 100%)',
        }}
      />
      <div
        className="absolute w-36 h-36 rounded-full blur-2xl opacity-20 pointer-events-none animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
