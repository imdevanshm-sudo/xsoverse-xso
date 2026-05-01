import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshTransmissionMaterial, MeshDistortMaterial, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface Xso3DPearlProps {
  isActive?: boolean;
  color?: string;
}

function PearlCore({ isActive, color }: { isActive: boolean; color: string }) {
  const outerMaterialRef = useRef<any>(null);
  const innerMaterialRef = useRef<any>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (innerMaterialRef.current) {
      // Smoothly interpolate distort and speed based on isActive
      const targetDistort = isActive ? 0.6 : 0.2;
      const targetSpeed = isActive ? 4 : 1;
      
      innerMaterialRef.current.distort = THREE.MathUtils.lerp(innerMaterialRef.current.distort, targetDistort, delta * 5);
      innerMaterialRef.current.speed = THREE.MathUtils.lerp(innerMaterialRef.current.speed, targetSpeed, delta * 5);
    }
    
    if (lightRef.current) {
      const targetIntensity = isActive ? 3 : 1;
      lightRef.current.intensity = THREE.MathUtils.lerp(lightRef.current.intensity, targetIntensity, delta * 5);
    }
  });

  return (
    <group>
      {/* Outer Shell (Premium Refractive Glass) */}
      <Sphere args={[1, 64, 64]}>
        <MeshTransmissionMaterial
          ref={outerMaterialRef}
          transmission={1}
          thickness={2}
          roughness={0.05}
          ior={1.5}
          chromaticAberration={0.08}
          backside={true}
          color="#1a1525"
          transparent
        />
      </Sphere>

      {/* Volatile Inner Core (The Magic) */}
      <Sphere args={[0.7, 128, 128]}>
        <MeshDistortMaterial
          ref={innerMaterialRef}
          color={color}
          emissive={color}
          emissiveIntensity={2}
          distort={0.2}
          speed={1}
        />
      </Sphere>

      {/* Internal Lighting */}
      <pointLight ref={lightRef} color={color} intensity={1} distance={5} />
    </group>
  );
}

export default function Xso3DPearl({ isActive = false, color = '#8b5cf6' }: Xso3DPearlProps) {
  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <React.Suspense fallback={null}>
          <Environment preset="studio" environmentIntensity={0.5} />
          
          <PearlCore isActive={isActive} color={color} />

          <EffectComposer>
            <Bloom luminanceThreshold={0.6} mipmapBlur intensity={1.5} />
          </EffectComposer>
        </React.Suspense>
      </Canvas>
    </div>
  );
}
