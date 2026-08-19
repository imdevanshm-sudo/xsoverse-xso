import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshTransmissionMaterial, MeshDistortMaterial, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface Xso3DPearlProps {
  isActive?: boolean;
  color?: string;
  openingMode?: boolean;
  emotion?: 'love' | 'friendship' | 'family' | 'gratitude' | 'memory' | 'anonymous';
}

function PearlCore({ 
  isActive, 
  color, 
  openingMode, 
  emotion = 'anonymous' 
}: { 
  isActive: boolean; 
  color: string; 
  openingMode: boolean; 
  emotion?: string;
}) {
  const outerMaterialRef = useRef<any>(null);
  const innerMaterialRef = useRef<any>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const shellGlowRef = useRef<THREE.PointLight>(null);
  const groupRef = useRef<THREE.Group>(null);
  const activeTimeRef = useRef(0);

  useFrame((state, delta) => {
    if (isActive && openingMode) {
      activeTimeRef.current = Math.min(4.0, activeTimeRef.current + delta);
    } else if (!isActive && openingMode) {
      activeTimeRef.current = Math.max(0, activeTimeRef.current - delta * 2);
    }

    const t = activeTimeRef.current;

    // --- Dynamic parameters based on the 0.0 - 4.0s transition timeline ---
    
    // Phase 1 (0.0 - 0.8s): Subtle physical response & surface reflection shifts
    const targetRotY = t > 0 ? (Math.min(0.8, t) / 0.8) * 0.45 : 0;
    const targetRotX = t > 0 ? (Math.min(0.8, t) / 0.8) * -0.2 : 0;
    
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, delta * 3.5);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 3.5);
    }

    // Phase 2 (0.8 - 1.8s): Internal light begins to appear (soft warm-neutral)
    let targetInnerEmissive = 0.28;
    let targetPointLight = 0.25;
    
    if (t > 0.8) {
      const progress = Math.min(1.0, (t - 0.8) / 1.0); // 0.0 to 1.0
      targetInnerEmissive = 0.28 + progress * 0.65; // grows to 0.93 (soft warm-neutral)
      targetPointLight = 0.25 + progress * 0.95; // point light illuminates interior
    }

    // Phase 3 (1.8 - 3.0s): Pearl becomes more translucent/luminous
    let targetRoughness = 0.22;
    let targetThickness = 3.5;
    
    if (t > 1.8) {
      const progress = Math.min(1.0, (t - 1.8) / 1.2); // 0.0 to 1.0
      targetRoughness = 0.22 - progress * 0.12; // drops to 0.10 (clearer)
      targetThickness = 3.5 - progress * 1.5; // drops to 2.0 (thinner shell)
      targetInnerEmissive = 0.93 + progress * 0.32; // emissive goes up to 1.25
      targetPointLight = 1.2 + progress * 0.6; // point light goes up to 1.8
    }

    // Phase 4 (3.0 - 4.0s): Pearl dissolves and releases its light
    let targetOpacity = 1.0;
    let targetScale = 1.0;
    
    if (t > 3.0) {
      const progress = Math.min(1.0, (t - 3.0) / 1.0); // 0.0 to 1.0
      targetOpacity = 1.0 - progress; // fades to 0
      targetScale = 1.0 + progress * 0.25; // swells slightly as it dissolves
      targetInnerEmissive = 1.25 * (1.0 - progress); // fade core as it spreads
      targetPointLight = 1.8 + progress * 2.5; // point light flares out
    }

    // Apply values with lerp for smooth physical transitions
    if (innerMaterialRef.current) {
      const baseDistort = isActive ? 0.15 : 0.06;
      innerMaterialRef.current.distort = THREE.MathUtils.lerp(innerMaterialRef.current.distort, baseDistort, delta * 4);
      innerMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        innerMaterialRef.current.emissiveIntensity,
        targetInnerEmissive,
        delta * 4,
      );
      innerMaterialRef.current.opacity = THREE.MathUtils.lerp(
        innerMaterialRef.current.opacity,
        targetOpacity,
        delta * 4,
      );
    }

    if (outerMaterialRef.current) {
      outerMaterialRef.current.roughness = THREE.MathUtils.lerp(outerMaterialRef.current.roughness, targetRoughness, delta * 4);
      outerMaterialRef.current.thickness = THREE.MathUtils.lerp(outerMaterialRef.current.thickness, targetThickness, delta * 4);
      outerMaterialRef.current.opacity = THREE.MathUtils.lerp(outerMaterialRef.current.opacity, targetOpacity, delta * 4);
    }

    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetPointLight, delta * 4);
    }

    if (shellGlowRef.current) {
      const breath = Math.sin(state.clock.elapsedTime * 1.25);
      const pulse = 0.16 + breath * 0.03;
      const targetShellIntensity = isActive ? (t > 3.0 ? 0 : 0.6) : pulse;
      shellGlowRef.current.intensity = THREE.MathUtils.lerp(
        shellGlowRef.current.intensity,
        targetShellIntensity,
        delta * 3,
      );
    }

    if (groupRef.current) {
      groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, delta * 4));
    }
  });

  return (
    <group ref={groupRef}>
      {/* Elegant highlight for the opening screen */}
      {openingMode && <directionalLight position={[2, 4, 3]} intensity={1.5} color="#ffffff" />}
      
      {/* Outer Shell (Premium Refractive Glass with warm-neutral taupe/champagne character) */}
      <Sphere args={[1, 64, 64]}>
        <MeshTransmissionMaterial
          ref={outerMaterialRef}
          transmission={1}
          thickness={openingMode ? 3.5 : 1.7}
          roughness={openingMode ? 0.22 : 0.08}
          ior={openingMode ? 1.38 : 1.5}
          chromaticAberration={openingMode ? 0.005 : 0.02}
          backside={true}
          color={openingMode ? "#221e1a" : "#16131b"} // warm neutral dark espresso tint
          attenuationColor={openingMode ? "#ffedd5" : undefined} // soft warm body tint scattering
          attenuationDistance={openingMode ? 1.5 : undefined}
          transparent
        />
      </Sphere>

      {/* Volatile Inner Core (The Magic) */}
      <Sphere args={[0.7, 128, 128]}>
        <MeshDistortMaterial
          ref={innerMaterialRef}
          color={color}
          emissive={color}
          emissiveIntensity={openingMode ? 0.28 : 0.82}
          distort={openingMode ? 0.06 : 0.12}
          speed={openingMode ? 0.12 : 0.45}
        />
      </Sphere>

      {/* Internal Lighting */}
      <pointLight ref={lightRef} color={color} intensity={openingMode ? 0.25 : 0.62} distance={4.2} />
      <pointLight ref={shellGlowRef} color={openingMode ? "#ffe4e6" : "#d9d1ff"} intensity={openingMode ? 0.2 : 0.5} distance={3.4} />
    </group>
  );
}

const renderEmotionalLightformers = (emotion: string) => {
  switch (emotion) {
    case 'love':
      return (
        <>
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          {/* Two subtle warm lights gently converging (closer together) */}
          <Lightformer form="circle" intensity={1.6} color="#ffebee" scale={[1.6, 1.6, 1]} position={[-0.8, 1.2, -3]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={1.4} color="#fdf2f8" scale={[1.4, 1.4, 1]} position={[0.8, 1.0, -3]} target={[0, 0, 0]} />
        </>
      );
    case 'friendship':
      return (
        <>
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          {/* Two independent lights coexisting and softly overlapping */}
          <Lightformer form="circle" intensity={1.3} color="#f0fdf4" scale={[1.8, 1.8, 1]} position={[-2.5, 1.8, -3.5]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={1.3} color="#ecfeff" scale={[1.8, 1.8, 1]} position={[2.5, 1.2, -3.5]} target={[0, 0, 0]} />
        </>
      );
    case 'family':
      return (
        <>
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          {/* A warmer central glow with surrounding subtle light */}
          <Lightformer form="rect" intensity={0.6} color="#ffedd5" scale={[6, 6, 1]} position={[0, 2, -6]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={1.5} color="#fffbeb" scale={[2.5, 2.5, 1]} position={[0, 0, -4]} target={[0, 0, 0]} />
        </>
      );
    case 'gratitude':
      return (
        <>
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          {/* A soft glow expanding/radiating outward */}
          <Lightformer form="circle" intensity={1.2} color="#fef8e0" scale={[3.5, 3.5, 1]} position={[0, 0, -4]} target={[0, 0, 0]} />
        </>
      );
    case 'memory':
      return (
        <>
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          {/* Light slowly appearing and fading like a remembered presence */}
          <Lightformer form="circle" intensity={0.8} color="#fafaf9" scale={[4, 4, 1]} position={[-1, 1, -5]} target={[0, 0, 0]} />
        </>
      );
    case 'anonymous':
    default:
      return (
        <>
          {/* Default neutral warm illumination with abstract coexisting shapes */}
          <Lightformer form="rect" intensity={0.25} color="#faf8f5" scale={[8, 8, 1]} position={[0, 4, -8]} />
          <Lightformer form="circle" intensity={1.4} color="#fefaf0" scale={[1.8, 1.8, 1]} position={[-2.2, 1.5, -2.5]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={1.1} color="#ffebd3" scale={[1.5, 1.5, 1]} position={[2.5, 2.2, -2.8]} target={[0, 0, 0]} />
          <Lightformer form="circle" intensity={0.3} color="#eae6df" scale={[3, 3, 1]} position={[0, 0, -5]} target={[0, 0, 0]} />
        </>
      );
  }
};

export default function Xso3DPearl({ 
  isActive = false, 
  color = '#8b5cf6', 
  openingMode = false,
  emotion = 'anonymous'
}: Xso3DPearlProps) {
  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <React.Suspense fallback={null}>
          <Environment preset={openingMode ? undefined : "studio"} environmentIntensity={openingMode ? 0.08 : 0.35}>
            {openingMode && renderEmotionalLightformers(emotion)}
          </Environment>
          
          <PearlCore isActive={isActive} color={color} openingMode={openingMode} emotion={emotion} />

          <EffectComposer>
            <Bloom luminanceThreshold={openingMode ? 0.95 : 0.85} mipmapBlur intensity={openingMode ? 0.08 : 0.7} />
          </EffectComposer>
        </React.Suspense>
      </Canvas>
    </div>
  );
}
