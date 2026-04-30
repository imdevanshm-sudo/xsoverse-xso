import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera, RoundedBox, Html, useTexture, useVideoTexture, Image } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  title?: string;
}

export interface XsoReceiverSanctumProps {
  masterAudioUrl: string;
  media: MediaItem[];
  onComplete?: () => void;
}

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

function AudioReactiveSymphony({ audioRef }: { audioRef: React.MutableRefObject<HTMLAudioElement | null> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 32;
  
  useEffect(() => {
    if (meshRef.current) {
        for(let i = 0; i < count; i++) {
            const offset = i - (count - 1) / 2;
            dummy.position.set(offset * 0.8, -5, -Math.abs(offset) * 0.5);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);

  useFrame((_, delta) => {
    if (!audioRef.current || audioRef.current.paused || audioRef.current.currentTime === 0) {
        if (meshRef.current) {
            for(let i = 0; i < count; i++) {
                meshRef.current.getMatrixAt(i, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.y = THREE.MathUtils.lerp(dummy.scale.y, 1, delta * 2);
                dummy.position.y = -5 + dummy.scale.y / 2;
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
        if (materialRef.current) {
            materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, 0, delta * 2);
        }
        return;
    }

    if (!audioContextRef.current) {
         try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                audioContextRef.current = new AudioContext();
            }
            if (audioContextRef.current) {
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 128;
                dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
                
                if (audioContextRef.current.state === 'suspended') {
                     audioContextRef.current.resume();
                }
            }
         } catch(e) {
            console.warn("AudioContext setup failed or already connected");
         }
    }

    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      let sum = 0;
      for(let i=0; i<10; i++) sum += dataArrayRef.current[i];
      const avgStr = (sum / 10) / 255;
      
      if (meshRef.current) {
          for(let i = 0; i < count; i++) {
              const val = dataArrayRef.current[i % (dataArrayRef.current.length / 2)] / 255;
              const targetScale = 1 + val * 6;
              
              meshRef.current.getMatrixAt(i, dummy.matrix);
              dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
              dummy.scale.y = THREE.MathUtils.lerp(dummy.scale.y, targetScale, delta * 15);
              dummy.position.y = -5 + dummy.scale.y / 2;
              dummy.updateMatrix();
              meshRef.current.setMatrixAt(i, dummy.matrix);
          }
          meshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (materialRef.current) {
          materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(materialRef.current.emissiveIntensity, avgStr * 2, delta * 10);
      }
    }
  });

  return (
    <group position={[0, -2, -10]}>
       <pointLight position={[0, 5, 0]} intensity={2} color="#ffffff" />
       <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
           <boxGeometry args={[0.7, 1, 0.7]} />
           <meshPhysicalMaterial 
               ref={materialRef} 
               color="#333333" 
               transmission={0.9} 
               opacity={1} 
               transparent 
               roughness={0.2} 
               metalness={0.5} 
               emissive="#000000" 
           />
       </instancedMesh>
    </group>
  );
}

function VibeController({ vibe, bgTexture, blurBg }: { vibe: 'VOID' | 'LOCATION', bgTexture: string | null, blurBg: boolean }) {
    const { scene } = useThree();
    
    useFrame(() => {
        if (vibe === 'VOID') {
            scene.background = new THREE.Color('#020104');
            scene.fog = new THREE.Fog('#020104', 10, 50) as any;
        } else if (vibe === 'LOCATION') {
            scene.background = new THREE.Color('#ffffff');
            scene.fog = new THREE.Fog('#ffffff', 10, 50) as any;
        }
    });

    if (vibe === 'LOCATION' && bgTexture) {
         return (
             <group>
                  <ambientLight intensity={1.5} />
                  <Image url={bgTexture} position={[0, 0, -50]} scale={[100, 100]} transparent opacity={blurBg ? 0.7 : 1} />
             </group>
         );
    }

    return null;
}

function VideoMaterial({ url, pmremEnvMap }: { url: string, pmremEnvMap: THREE.Texture | null }) {
    const texture = useVideoTexture(url, { crossOrigin: 'Anonymous', muted: true, loop: true, playsInline: true });
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    return <meshPhysicalMaterial map={texture} color="#ffffff" clearcoat={1} roughness={0.15} metalness={0.8} envMap={pmremEnvMap} envMapIntensity={0.6} />;
}

function ImageMaterial({ url, pmremEnvMap }: { url: string, pmremEnvMap: THREE.Texture | null }) {
    const texture = useTexture(url);
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    return <meshPhysicalMaterial map={texture} color="#ffffff" clearcoat={1} roughness={0.15} metalness={0.8} envMap={pmremEnvMap} envMapIntensity={0.6} />;
}

function AudioMaterial({ pmremEnvMap }: { pmremEnvMap: THREE.Texture | null }) {
    return <meshPhysicalMaterial color="#222222" clearcoat={1} roughness={0.15} metalness={0.9} envMap={pmremEnvMap} envMapIntensity={0.8} />;
}

function PolaroidSlab({ item, position, aesthetic, variant }: { item: MediaItem, position: [number, number, number], aesthetic: number, variant: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const envMapPaths = xsoAesthetics[aesthetic] || xsoAesthetics[1];
  const envMapPath = envMapPaths[variant] || envMapPaths[0];

  const { gl } = useThree();
  const rawEnvTexture = useTexture(envMapPath);
  const [pmremEnvMap, setPmremEnvMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
     if (rawEnvTexture) {
         try {
             // Let texture initialize properly
             rawEnvTexture.colorSpace = THREE.SRGBColorSpace;
             const generator = new THREE.PMREMGenerator(gl);
             generator.compileEquirectangularShader();
             const rt = generator.fromEquirectangular(rawEnvTexture);
             generator.dispose();
             setPmremEnvMap(rt.texture);
             return () => {
                 rt.dispose();
             }
         } catch(e) {
             rawEnvTexture.mapping = THREE.EquirectangularReflectionMapping;
             setPmremEnvMap(rawEnvTexture);
         }
     }
  }, [rawEnvTexture, gl]);

  useFrame((state) => {
     if (groupRef.current) {
         groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[2]) * 0.2;
     }
  });

  return (
    <group ref={groupRef} position={position}>
       <RoundedBox args={[3.2, 4.2, 0.2]} radius={0.05} position={[0, 0, 0]}>
           <meshStandardMaterial color="#111111" roughness={0.8} />
       </RoundedBox>
       
       <mesh position={[0, 0, 0.101]}>
           <planeGeometry args={[3.0, 4.0]} />
           {item.type === 'video' ? (
               <VideoMaterial url={item.url || ''} pmremEnvMap={pmremEnvMap} />
           ) : item.type === 'audio' ? (
               <AudioMaterial pmremEnvMap={pmremEnvMap} />
           ) : (
               <ImageMaterial url={item.url || ''} pmremEnvMap={pmremEnvMap} />
           )}
       </mesh>
       
       {item.title && (
           <Html position={[0, -2.8, 0]} center style={{ pointerEvents: 'none' }}>
               <div style={{ width: '80vw', maxWidth: '300px', textAlign: 'center' }}>
                   <h3 className="text-white text-sm tracking-widest uppercase font-mono opacity-50 break-words drop-shadow-md">{item.title}</h3>
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

export default function XsoReceiverSanctum({ masterAudioUrl, media, onComplete }: XsoReceiverSanctumProps) {
  const [vibe, setVibe] = useState<'VOID' | 'LOCATION'>('VOID');
  const [aesthetic, setAesthetic] = useState<number>(1);
  const [variant, setVariant] = useState<number>(0); 
  const [bgTexture, setBgTexture] = useState<string | null>(null);
  const [blurBg, setBlurBg] = useState<boolean>(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const togglePlay = () => {
      if (!audioRef.current) return;
      if (audioRef.current.paused) {
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

      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-4 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl z-50 pointer-events-auto select-none">
         <div className="flex flex-col gap-2">
             <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10">VIBE</div>
             <button onClick={() => setVibe('VOID')} className={`text-xs text-left px-2 py-1 ${vibe === 'VOID' ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10`}>VOID</button>
             <button onClick={() => setVibe('LOCATION')} className={`text-xs text-left px-2 py-1 ${vibe === 'LOCATION' ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10`}>LOCATION</button>
         </div>

         {vibe === 'VOID' && (
            <div className="flex flex-col gap-2">
                 <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10 mt-2">AESTHETIC</div>
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
         )}

         {vibe === 'LOCATION' && (
             <div className="flex flex-col gap-2">
                 <div className="text-white/40 text-[10px] tracking-widest uppercase pb-2 border-b border-white/10 mt-2">BACKGROUND</div>
                 <label className="text-xs text-left px-2 py-1 text-white/80 hover:bg-white/10 cursor-pointer block border-l-2 border-white/20">
                     UPLOAD
                     <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                             const url = URL.createObjectURL(file);
                             setBgTexture(url);
                         }
                     }} />
                 </label>
                 <button onClick={() => setBlurBg(!blurBg)} className={`text-xs text-left px-2 py-1 ${blurBg ? 'text-white border-l-2 border-white' : 'text-white/40'} hover:bg-white/10 mt-2`}>
                     BLUR: {blurBg ? 'ON' : 'OFF'}
                 </button>
             </div>
         )}
      </div>

      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
         <Environment preset="night" />
         <PerspectiveCamera makeDefault fov={35} position={[0, 0, 15]} />

         <VibeController vibe={vibe} bgTexture={bgTexture} blurBg={blurBg} />

         {vibe === 'VOID' && <AudioReactiveSymphony audioRef={audioRef} />}

         <ScrollGroup currentIndex={currentIndex}>
            {media.map((item, i) => (
               <Suspense key={item.id} fallback={null}>
                  <PolaroidSlab 
                      item={item} 
                      position={[i % 2 === 0 ? -1.5 : 1.5, i % 2 === 0 ? 0.2 : -0.2, i * -20]} 
                      aesthetic={aesthetic} 
                      variant={variant} 
                  />
               </Suspense>
            ))}
         </ScrollGroup>

         <EffectComposer>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1} />
            <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
            <Noise opacity={0.03} />
         </EffectComposer>
      </Canvas>
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-50 gap-2">
         {media.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? 'bg-white scale-150' : 'bg-white/30'}`} />
         ))}
      </div>
      
      <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-50">
         <h1 className="text-white/80 text-xs tracking-[0.4em] font-mono uppercase drop-shadow-lg">XSO RECEIVER</h1>
      </div>
    </div>
  );
}
