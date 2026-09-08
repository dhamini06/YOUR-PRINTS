'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface IdentityCoreProps {
  className?: string;
}

export default function IdentityCore({ className = '' }: IdentityCoreProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect WebGL capability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Geometry: Abstract Biometric Ridge Waves & Concentric Signal Rings
    const group = new THREE.Group();
    scene.add(group);

    // Create concentric biometric ellipses resembling fingerprint whorls & signal waves
    const ringCount = 18;
    const pointsPerRing = 120;
    const allRingPoints: THREE.Vector3[][] = [];

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0x111110,
      transparent: true,
      opacity: 0.28,
      linewidth: 1,
    });

    const activeRingMaterial = new THREE.LineBasicMaterial({
      color: 0x111110,
      transparent: true,
      opacity: 0.65,
    });

    for (let r = 1; r <= ringCount; r++) {
      const radiusBase = (r / ringCount) * 5.2;
      const ringPoints: THREE.Vector3[] = [];
      const isKeyRing = r % 4 === 0;

      for (let i = 0; i <= pointsPerRing; i++) {
        const theta = (i / pointsPerRing) * Math.PI * 2;
        
        // Biometric ridge deformation: asymmetry + subtle frequency modulation
        const eccentricity = 1.25 + Math.sin(theta * 2) * 0.15;
        const wave = Math.sin(theta * 6 + r * 0.5) * 0.08 * (r / ringCount);
        const zElevation = Math.sin(theta * 3 + r * 0.4) * 0.4 * (1 - r / ringCount);

        const x = Math.cos(theta) * (radiusBase + wave) * eccentricity;
        const y = Math.sin(theta) * (radiusBase + wave);
        const z = zElevation;

        ringPoints.push(new THREE.Vector3(x, y, z));
      }

      allRingPoints.push(ringPoints);

      const geometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const line = new THREE.Line(geometry, isKeyRing ? activeRingMaterial : ringMaterial);
      group.add(line);
    }

    // 3. Digital Signal Nodes (Particles scattered along ridges with accent highlights)
    const particleCount = 180;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorDark = new THREE.Color(0x111110);
    const colorLime = new THREE.Color(0xC8FF00); // Acid chartreuse accent
    const colorSecondary = new THREE.Color(0x64635E);

    for (let i = 0; i < particleCount; i++) {
      // Pick random ring and point
      const ringIdx = Math.floor(Math.random() * ringCount);
      const ring = allRingPoints[ringIdx];
      const ptIdx = Math.floor(Math.random() * (pointsPerRing - 1));
      const pt = ring[ptIdx];

      particlePositions[i * 3] = pt.x + (Math.random() - 0.5) * 0.15;
      particlePositions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.15;
      particlePositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.25;

      // Selectively highlight signal nodes in lime
      const isAccent = Math.random() < 0.18;
      const chosenColor = isAccent ? colorLime : (Math.random() < 0.5 ? colorDark : colorSecondary);

      particleColors[i * 3] = chosenColor.r;
      particleColors[i * 3 + 1] = chosenColor.g;
      particleColors[i * 3 + 2] = chosenColor.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    // 4. Central Core Target Pulse
    const coreGeometry = new THREE.RingGeometry(0.2, 0.28, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x111110,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    // 5. Mouse Interaction with Dampening
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.35;
    let targetRotationY = -0.2;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      mouseX = x;
      mouseY = y;
      targetRotationY = x * 0.8;
      targetRotationX = 0.35 - y * 0.6;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 6. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // 7. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damped rotation towards cursor
      group.rotation.y += (targetRotationY - group.rotation.y) * 0.04;
      group.rotation.x += (targetRotationX - group.rotation.x) * 0.04;

      // Ambient breathing and rotational drift
      group.rotation.z = Math.sin(elapsedTime * 0.3) * 0.08;
      particles.rotation.z = elapsedTime * 0.02;

      // Subtle pulse on core
      const pulse = 1 + Math.sin(elapsedTime * 2) * 0.12;
      coreMesh.scale.set(pulse, pulse, 1);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    // Elegant fallback SVG for devices without WebGL
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <svg viewBox="0 0 400 400" className="w-full h-full opacity-60">
          <circle cx="200" cy="200" r="180" fill="none" stroke="#E5E4DE" strokeWidth="0.5" strokeDasharray="4 4" />
          <ellipse cx="200" cy="200" rx="140" ry="110" fill="none" stroke="#111110" strokeWidth="0.5" opacity="0.3" />
          <ellipse cx="200" cy="200" rx="100" ry="80" fill="none" stroke="#111110" strokeWidth="0.7" opacity="0.5" />
          <ellipse cx="200" cy="200" rx="60" ry="45" fill="none" stroke="#C8FF00" strokeWidth="1.2" />
          <circle cx="200" cy="200" r="4" fill="#111110" />
          <line x1="200" y1="20" x2="200" y2="380" stroke="#E5E4DE" strokeWidth="0.5" />
          <line x1="20" y1="200" x2="380" y2="200" stroke="#E5E4DE" strokeWidth="0.5" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />
      {/* Precision reticle crosshair overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-24 h-24 border border-dashed border-[#E5E4DE] rounded-full opacity-40"></div>
        <div className="absolute top-4 left-4 font-mono text-[9px] text-[#64635E] tracking-widest uppercase">
          SIG.WAVE // 3D.CORE
        </div>
        <div className="absolute bottom-4 right-4 font-mono text-[9px] text-[#64635E] tracking-widest uppercase">
          EVIDENCE.MESH
        </div>
      </div>
    </div>
  );
}
