import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

export interface AudioReactiveSymphonyProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export default function AudioReactiveSymphony({ audioRef }: AudioReactiveSymphonyProps) {
  const { scene, gl } = useThree();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    const audioEl = audioRef.current;

    const initAudio = () => {
      // Need a user interaction or just hope the audio is playing or we create Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioEl);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          setIsReady(true);
        } catch (e) {
          console.warn("Media element already connected or errored:", e);
          setIsReady(true); // maybe it's already playing
        }
      }
    };

    const handlePlay = () => {
      initAudio();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    audioEl.addEventListener('play', handlePlay);

    // Try init immediately in case it's already playing
    if (!audioEl.paused) {
      handlePlay();
    }

    return () => {
      audioEl.removeEventListener('play', handlePlay);
    };
  }, [audioRef]);

  return (
    <>
      <Environment preset="night" />
      <ambientLight intensity={0.2} color="#ffffff" />
      <pointLight position={[0, 10, 0]} intensity={1.5} color="#ffffff" distance={30} />
      
      {isReady && analyserRef.current && dataArrayRef.current && (
        <group position={[0, -15, -50]}>
          <PianoMonoliths analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
          <HarpStrings analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
          <GuitarRings analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
        </group>
      )}

      {/* Ground Reflection */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[400, 400]}
          resolution={1024}
          mixBlur={1}
          mixStrength={10}
          roughness={0.8}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#151515"
          metalness={0.5}
          mirror={1}
        />
      </mesh>
    </>
  );
}

// ============================================
// Instruments Base code
// ============================================

function averageP(dataArray: Uint8Array, start: number, end: number) {
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += dataArray[i];
  }
  return sum / (end - start + 1);
}

function PianoMonoliths({ analyserRef, dataArrayRef }: any) {
  const count = 16;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scales = useRef(new Float32Array(count).fill(1));

  useFrame((_, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    // We already call getByteFrequencyData in Symphony component, but if it has to be once per frame, let's just do it in one of them or here. 
    // It's safe to call multiple times or we can just read the array. Since the array is shared, reading is fine.
    // The parent doesn't call it in useFrame, so we must call it here once.
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Bass approx 0-10
    const bassStr = averageP(dataArrayRef.current, 0, 10) / 255;
    
    for(let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        const x = offset * 1.5;
        const z = -8 - Math.abs(offset) * 0.5; // arc shape
        
        const localBass = dataArrayRef.current[i % 11] / 255;
        const targetScaleY = 1 + localBass * 6;
        scales.current[i] = THREE.MathUtils.lerp(scales.current[i], targetScaleY, delta * 8);
        
        dummy.position.set(x, -5 + scales.current[i] / 2, z);
        dummy.scale.set(1, scales.current[i], 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (materialRef.current) {
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, bassStr * 8, delta * 10);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
       <boxGeometry args={[1.2, 1, 1.2]} />
       <meshPhysicalMaterial 
          ref={materialRef}
          color="#444444"
          transmission={0.9}
          roughness={0.1}
          metalness={0.8}
          emissive="#ffffff"
          emissiveIntensity={0}
          transparent
          opacity={1}
       />
    </instancedMesh>
  );
}

function HarpStrings({ analyserRef, dataArrayRef }: any) {
  const count = 24;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const phases = useMemo(() => Array.from({length: count}, () => Math.random() * Math.PI * 2), []);

  useFrame(({ clock }, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    const time = clock.getElapsedTime();
    // Treble approx 40-63
    const trebleStr = averageP(dataArrayRef.current, 40, 63) / 255;

    for(let i = 0; i < count; i++) {
        const offset = i - (count - 1) / 2;
        const basePathX = offset * 0.5;
        const basePathZ = -2 + Math.abs(offset) * 0.15;
        
        // Vibrate based on treble
        const localTreble = dataArrayRef.current[40 + (i % 23)] / 255;
        const vibration = Math.sin(time * 40 + phases[i]) * (localTreble * 0.4 + trebleStr * 0.2);
        
        dummy.position.set(basePathX + vibration, 5, basePathZ);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (materialRef.current) {
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, trebleStr * 8, delta * 10);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
       <cylinderGeometry args={[0.015, 0.015, 20, 8]} />
       <meshPhysicalMaterial 
          ref={materialRef}
          color="#444444"
          emissive="#ffffff"
          emissiveIntensity={0}
          roughness={0.2}
          metalness={0.8}
       />
    </instancedMesh>
  );
}

function GuitarRings({ analyserRef, dataArrayRef }: any) {
  const count = 6;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const rings = useRef<{ scale: number, opacity: number, active: boolean }[]>(
     Array.from({length: count}, () => ({ scale: 0, opacity: 0, active: false }))
  );
  const lastMidLevel = useRef(0);

  useEffect(() => {
    if (meshRef.current) {
      for(let i = 0; i < count; i++) {
        meshRef.current.setColorAt(i, new THREE.Color(0,0,0));
      }
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }
  }, []);

  useFrame((_, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    // Mids approx 11-39
    const midsStr = averageP(dataArrayRef.current, 11, 39) / 255;
    
    if (midsStr > 0.4 && midsStr - lastMidLevel.current > 0.1) {
        // trigger ring
        let inactive = rings.current.find(r => !r.active);
        if (!inactive) {
            inactive = rings.current.reduce((prev, curr) => prev.scale > curr.scale ? prev : curr);
        }
        inactive.active = true;
        inactive.scale = 1;
        inactive.opacity = 1;
    }
    lastMidLevel.current = midsStr;
    
    for(let i = 0; i < count; i++) {
        const ring = rings.current[i];
        if (ring.active) {
            ring.scale += delta * 6; // grow
            ring.opacity -= delta * 0.7; // fade
            
            if (ring.opacity <= 0) {
               ring.active = false;
               ring.opacity = 0;
            }
        }
        
        dummy.position.set(0, 0, -4);
        dummy.scale.set(ring.scale, ring.scale, ring.scale);
        dummy.rotation.x = Math.PI / 2;
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        
        // Blend color using opacity
        const intensity = ring.opacity * 10;
        const color = new THREE.Color("#ffffff").multiplyScalar(intensity);
        meshRef.current.setColorAt(i, color);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
       <torusGeometry args={[1, 0.04, 16, 100]} />
       <meshPhysicalMaterial 
          ref={materialRef}
          color="#444444"
          emissive="#ffffff"
          emissiveIntensity={1}
          roughness={0.2}
          metalness={0.8}
          transparent
       />
    </instancedMesh>
  );
}
