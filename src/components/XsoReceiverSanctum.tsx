import React, { useEffect, useRef, useState, useMemo, Suspense, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, RoundedBox, Html, useTexture, useVideoTexture, Image } from '@react-three/drei';
import * as THREE from 'three';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  title?: string;
  duration?: string;
  voiceNoteUrl?: string;
}

export interface XsoReceiverSanctumProps {
  masterAudioUrl: string;
  media: MediaItem[];
  auraWeight?: number[];
  onComplete?: () => void;
}

// 4K Symbolic Aesthetic Textures
const xsoAesthetics: Record<number, string[]> = {
  1: ['/aesthetic-heart.jpg', '/aesthetic-rainbow.jpg'],
  2: ['/aesthetic-moon.jpg', '/aesthetic-star.jpg'],
  3: ['/aesthetic-sparkle.jpg', '/aesthetic-flower.jpg'],
  4: ['/aesthetic-flame.jpg', '/aesthetic-cloud.jpg'],
  5: ['/aesthetic-crystal.jpg', '/aesthetic-eye.jpg'],
  6: ['/aesthetic-wing.jpg', '/aesthetic-tree.jpg'],
  7: ['/aesthetic-teardrop.jpg', '/aesthetic-sun.jpg'],
  8: ['/aesthetic-butterfly.jpg', '/aesthetic-shell.jpg'],
  9: ['/aesthetic-crown.jpg', '/aesthetic-sword.jpg']
};

// ==========================================
// THE CINEMATIC SYMPHONY (3 INSTRUMENTS)
// ==========================================

function PianoMonoliths({ analyserRef, dataArrayRef }: any) {
  const count = 12;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (meshRef.current) {
        for(let i = 0; i < count; i++) {
            const angle = (i / (count - 1)) * (Math.PI * 0.6) - (Math.PI * 0.3);
            const radius = 14;
            const x = Math.sin(angle) * radius;
            const z = -8 - Math.cos(angle) * 4;
            
            dummy.position.set(x, -6, z);
            dummy.rotation.y = angle; 
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);

  useFrame((_, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    
    let sum = 0;
    for(let i=0; i<12; i++) sum += dataArrayRef.current[i];
    const bassAvg = (sum / 12) / 255;
    
    for(let i = 0; i < count; i++) {
        const val = dataArrayRef.current[i % 12] / 255;
        const targetScaleY = 1 + val * 2.5; 
        
        meshRef.current.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.scale.y = THREE.MathUtils.lerp(dummy.scale.y, targetScaleY, delta * 10);
        dummy.position.y = -6 + (dummy.scale.y * 3) / 2; 
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (materialRef.current) {
        materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, bassAvg * 1.5, delta * 8);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <boxGeometry args={[0.3, 3, 0.3]} />
        <meshPhysicalMaterial 
            ref={materialRef} 
            color="#050505" 
            transmission={0.9} 
            opacity={1} 
            transparent 
            roughness={0.1} 
            metalness={0.8} 
            ior={1.5}
            emissive="#ffffff" 
            emissiveIntensity={0}
        />
    </instancedMesh>
  );
}

function GuitarRings({ analyserRef, dataArrayRef }: any) {
  const count = 3;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (meshRef.current) {
        for(let i = 0; i < count; i++) {
            dummy.position.set(0, 0, -15 - i * 2);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);

  useFrame((_, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    
    let sum = 0;
    for(let i=12; i<40; i++) sum += dataArrayRef.current[i];
    const midAvg = (sum / 28) / 255;
    
    for(let i = 0; i < count; i++) {
        meshRef.current.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        const targetScale = 1 + (midAvg * (i + 1) * 1.5);
        dummy.scale.setScalar(THREE.MathUtils.lerp(dummy.scale.x, targetScale, delta * 5));
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <torusGeometry args={[4, 0.02, 16, 100]} />
        <meshBasicMaterial 
            color="#88ccff" 
            transparent 
            opacity={0.3} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
    </instancedMesh>
  );
}

function HarpStrings({ analyserRef, dataArrayRef }: any) {
  const count = 20;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useEffect(() => {
    if (meshRef.current) {
        for(let i = 0; i < count; i++) {
            const x = (i - count/2) * 0.8;
            dummy.position.set(x, 4, -12);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);

  useFrame((state, delta) => {
    if (!analyserRef.current || !dataArrayRef.current || !meshRef.current) return;
    
    let sum = 0;
    for(let i=80; i<120; i++) sum += dataArrayRef.current[i];
    const trebleAvg = (sum / 40) / 255;
    
    for(let i = 0; i < count; i++) {
        const val = dataArrayRef.current[80 + i] / 255;
        meshRef.current.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        const targetX = ((i - count/2) * 0.8) + (Math.sin(state.clock.elapsedTime * 10 + i) * val * 0.2);
        dummy.position.x = THREE.MathUtils.lerp(dummy.position.x, targetX, delta * 15);
        
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (materialRef.current) {
        materialRef.current.color.setHSL(0.1, 0.8, THREE.MathUtils.lerp(0.1, 0.8, trebleAvg));
        materialRef.current.opacity = THREE.MathUtils.lerp(0.1, 0.8, trebleAvg);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.015, 0.015, 12, 8]} />
        <meshBasicMaterial 
            ref={materialRef}
            color="#ffcc88" 
            transparent 
            opacity={0.2}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
        />
    </instancedMesh>
  );
}

function AudioReactiveSymphony({ 
  audioRef, 
  analyserRef, 
  dataArrayRef 
}: { 
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  dataArrayRef: React.MutableRefObject<Uint8Array | null>
}) {
  
  useFrame(() => {
    if (audioRef.current && !audioRef.current.paused && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    } else if (dataArrayRef.current) {
        dataArrayRef.current.fill(0);
    }
  });

  return (
    <group position={[0, -1, -5]}>
       <pointLight position={[-8, 2, -10]} intensity={1.5} color="#5533ff" distance={25} />
       <pointLight position={[8, 4, -10]} intensity={1.5} color="#ff3388" distance={25} />

       <PianoMonoliths analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
       <GuitarRings analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
       <HarpStrings analyserRef={analyserRef} dataArrayRef={dataArrayRef} />
    </group>
  );
}

// ==========================================
// SCENE CONTROLLERS & POLAROID
// ==========================================

function VibeController({ vibe, bgTexture, blurBg }: { vibe: 'VOID' | 'LOCATION', bgTexture: string | null, blurBg: boolean }) {
    const { scene } = useThree();
    
    useEffect(() => {
        if (vibe === 'VOID') {
            scene.background = new THREE.Color('#020104');
            scene.fog = new THREE.Fog('#020104', 10, 35); 
        } else {
            scene.background = new THREE.Color('#ffffff');
            scene.fog = new THREE.Fog('#ffffff', 10, 50);
        }
    }, [vibe, scene]);

    if (vibe === 'LOCATION' && bgTexture) {
         return (
             <group>
                  <ambientLight intensity={1.5} />
                  <Suspense fallback={null}>
                      <Image url={bgTexture} position={[0, 0, -40]} scale={[100, 100]} transparent opacity={blurBg ? 0.4 : 1} />
                  </Suspense>
             </group>
         );
    }

    return null;
}

// The Base Photo Layers (Acts like Matte Paper)
function VideoMaterial({ url }: { url: string }) {
    const texture = useVideoTexture(url, { crossOrigin: 'Anonymous', muted: true, loop: true, playsInline: true });
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    return <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} />;
}

function ImageMaterial({ url }: { url: string }) {
    const texture = useTexture(url);
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    return <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} />;
}

function PolaroidSlab({ item, position, aesthetic, variant, vibe }: { item: MediaItem, position: [number, number, number], aesthetic: number, variant: number, vibe: 'VOID' | 'LOCATION' }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const envMapPaths = xsoAesthetics[aesthetic] || xsoAesthetics[1];
  const envMapPath = envMapPaths[variant] || envMapPaths[0];

  const aestheticTexture = useTexture(envMapPath);

  useLayoutEffect(() => {
     if (aestheticTexture) {
         aestheticTexture.mapping = THREE.EquirectangularReflectionMapping;
         aestheticTexture.colorSpace = THREE.SRGBColorSpace;
         aestheticTexture.needsUpdate = true;
     }
  }, [aestheticTexture]);

  useFrame((state) => {
     if (groupRef.current) {
         groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[2]) * 0.15;
         groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
     }
  });

  return (
    <group ref={groupRef} position={position}>
       {/* Polaroid Frame - Sleek Dark Grey (#2a2a2a) to stand out against the void */}
       <RoundedBox args={[3.2, 4.2, 0.2]} radius={0.05} position={[0, 0, 0]}>
           <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
       </RoundedBox>
       
       {/* Dedicated light just for this Polaroid to highlight the glossy clearcoat */}
       <pointLight position={[0, 3, 4]} intensity={2.5} color="#ffffff" distance={15} decay={2} />
       
       {/* LAYER 1: Actual Photo Face (Matte Base) */}
       <mesh position={[0, 0, 0.101]}>
           <planeGeometry args={[3.0, 4.0]} />
           {item.type === 'video' && item.url ? (
               <VideoMaterial url={item.url} />
           ) : item.type === 'audio' ? (
               <meshStandardMaterial color="#111" roughness={0.9} metalness={0.1} />
           ) : item.url ? (
               <ImageMaterial url={item.url} />
           ) : (
               <meshStandardMaterial color="#000" />
           )}
       </mesh>

       {/* LAYER 2: Double Exposure Reflection Overlay (Hearts/Emojis) */}
       <mesh position={[0, 0, 0.102]}>
           <planeGeometry args={[3.0, 4.0]} />
           <meshBasicMaterial 
               map={aestheticTexture} 
               transparent 
               opacity={0.35} 
               blending={THREE.AdditiveBlending} 
               depthWrite={false} 
           />
       </mesh>

       {/* LAYER 3: Thick Physical Glass Shield (Clearcoat 1, Metalness 0.1) */}
       <mesh position={[0, 0, 0.103]}>
           <planeGeometry args={[3.0, 4.0]} />
           <meshPhysicalMaterial 
               color="#ffffff"
               transmission={0.2}
               opacity={1}
               transparent
               roughness={0.05}
               metalness={0.1}
               clearcoat={1.0}
               clearcoatRoughness={0.1}
               envMap={aestheticTexture}
               envMapIntensity={1.5}
               depthWrite={false}
           />
       </mesh>

       {/* Glassmorphism Ambient Glow Behind the Polaroid */}
       {vibe === 'VOID' && (
           <mesh position={[0, 0, -0.5]} scale={[2.0, 2.0, 1]}>
               <planeGeometry args={[6, 6]} />
               <meshBasicMaterial 
                   map={aestheticTexture} 
                   transparent 
                   opacity={0.15} 
                   blending={THREE.AdditiveBlending} 
                   depthWrite={false} 
               />
           </mesh>
       )}
       
       {/* Title Overlay */}
       {vibe === 'VOID' && item.title && (
           <Html position={[0, -2.8, 0]} center zIndexRange={[10, 0]}>
               <div style={{ width: '80vw', maxWidth: '300px', textAlign: 'center', pointerEvents: 'none' }}>
                   <h3 className="text-white text-sm tracking-widest uppercase font-mono opacity-60 break-words drop-shadow-md">
                       {item.title}
                   </h3>
               </div>
           </Html>
       )}
    </group>
  );
}

function ScrollGroup({ currentIndex, children }: { currentIndex: number, children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (groupRef.current) {
            const targetZ = currentIndex * 20;
            groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, delta * 6);
        }
    });

    return (
       <group ref={groupRef}>
           {children}
       </group>
    );
}

// ==========================================
// MAIN SANCTUM APP
// ==========================================

export default function XsoReceiverSanctum({ masterAudioUrl, media, onComplete }: XsoReceiverSanctumProps) {
  const [vibe, setVibe] = useState<'VOID' | 'LOCATION'>('VOID');
  const [aesthetic, setAesthetic] = useState<number>(1);
  const [variant, setVariant] = useState<number>(0); 
  const [bgTexture, setBgTexture] = useState<string | null>(null);
  const [blurBg, setBlurBg] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
     if (!masterAudioUrl) return;
     const audio = new Audio(masterAudioUrl);
     audio.crossOrigin = 'anonymous';
     audio.loop = true;
     audioRef.current = audio;

     return () => {
         audio.pause();
         audio.src = '';
     }
  }, [masterAudioUrl]);

  const initAudioEngine = () => {
    try {
        if (!audioContextRef.current && audioRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
            
            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
        }
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    } catch (e) {
        console.warn("Audio context setup blocked.", e);
    }
  };

  const togglePlay = () => {
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
          initAudioEngine();
          audioRef.current.play().catch(()=>{});
          setIsPlaying(true);
      } else {
          audioRef.current.pause();
          setIsPlaying(false);
      }
  };
  
  const handleScroll = (dir: number) => {
    const next = currentIndex + dir;
    if (next >= 0 && next < media.length) {
       setCurrentIndex(next);
    } else if (next >= media.length && onComplete) {
       onComplete();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (Math.abs(e.deltaY) > 50) {
         handleScroll(e.deltaY > 0 ? 1 : -1);
      }
  };

  return (
    <div className="absolute inset-0 bg-black font-mono overflow-hidden touch-none" onWheel={handleWheel}>
      
      <div className="absolute top-6 left-6 z-50 pointer-events-auto flex flex-col gap-2">
         <button onClick={togglePlay} className="px-4 py-2 border border-white/20 text-white text-xs uppercase hover:bg-white/10 rounded-full tracking-widest backdrop-blur-md">
            {isPlaying ? 'PAUSE MUSIC' : 'PLAY MUSIC'}
         </button>
      </div>

      {vibe === 'LOCATION' ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <div className="bg-[#111111] p-8 border border-white/10 rounded-xl pointer-events-auto flex flex-col items-center gap-4 shadow-2xl">
                  <h2 className="text-white text-sm tracking-widest uppercase">LOCATION BACKGROUND</h2>
                  <label className="px-6 py-3 border border-white/20 text-white text-xs uppercase hover:bg-white/10 cursor-pointer block rounded transition-colors bg-white/5">
                     UPLOAD IMAGE
                     <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                             const url = URL.createObjectURL(file);
                             setBgTexture(url);
                         }
                     }} />
                 </label>
                 <button onClick={() => setBlurBg(!blurBg)} className={`text-xs px-4 py-2 mt-2 rounded transition-colors ${blurBg ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                     BLUR: {blurBg ? 'ON' : 'OFF'}
                 </button>
                 <button onClick={() => setVibe('VOID')} className="text-xs px-4 py-2 mt-4 text-white/50 hover:text-white transition-colors uppercase tracking-widest border-t border-white/10 pt-4 w-full">
                     RETURN TO VOID
                 </button>
              </div>
          </div>
      ) : (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-4 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl z-50 pointer-events-auto select-none">
             <div className="flex flex-col gap-2">
                 <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10">VIBE</div>
                 <button onClick={() => setVibe('VOID')} className={`text-xs text-left px-2 py-1 ${vibe === 'VOID' ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10`}>1. MEMORY VOID</button>
                 <button onClick={() => setVibe('LOCATION')} className={`text-xs text-left px-2 py-1 ${vibe as any === 'LOCATION' ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10`}>2. LOCATION</button>
             </div>

             <div className="flex flex-col gap-2">
                  <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10 mt-2">AESTHETIC TYPE</div>
                  <div className="grid grid-cols-2 gap-1 px-1">
                      {Object.keys(xsoAesthetics).map((a) => (
                          <button key={a} onClick={() => setAesthetic(Number(a))} className={`text-[10px] text-left px-2 py-1 ${aesthetic === Number(a) ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10`}>
                              AURA {a}
                          </button>
                      ))}
                  </div>
                  <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10 mt-2">VARIANT</div>
                  <div className="flex gap-2 px-1">
                      {[0, 1].map((v) => (
                          <button key={v} onClick={() => setVariant(v)} className={`w-6 h-6 flex items-center justify-center text-xs rounded transition-colors ${variant === v ? 'bg-white text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                              {v + 1}
                          </button>
                      ))}
                  </div>
             </div>
          </div>
      )}

      <Canvas style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
         {/* Essential global lighting to prevent black silhouettes */}
         <ambientLight intensity={0.5} />
         <Environment preset="night" environmentIntensity={0.2} />
         
         <PerspectiveCamera makeDefault fov={35} position={[0, 0, 16]} />

         <VibeController vibe={vibe} bgTexture={bgTexture} blurBg={blurBg} />

         {vibe === 'VOID' && (
             <AudioReactiveSymphony 
                 audioRef={audioRef} 
                 analyserRef={analyserRef} 
                 dataArrayRef={dataArrayRef} 
             />
         )}

         <ScrollGroup currentIndex={currentIndex}>
            {media.map((item, i) => (
               <Suspense key={item.id} fallback={null}>
                  <PolaroidSlab 
                      item={item} 
                      position={[0, 0.2, i * -20]}
                      aesthetic={aesthetic} 
                      variant={variant}
                      vibe={vibe}
                  />
               </Suspense>
            ))}
         </ScrollGroup>
      </Canvas>
      
      {vibe === 'VOID' && (
         <>
            <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-40 gap-2">
               {media.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-150' : 'bg-white/30'}`} />
               ))}
            </div>
            
            <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-40">
               <h1 className="text-white/80 text-xs tracking-[0.4em] font-mono uppercase drop-shadow-lg">XSO RECEIVER</h1>
            </div>
         </>
      )}
    </div>
  );
}