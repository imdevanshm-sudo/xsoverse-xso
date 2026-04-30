import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, SpotLight, Html, useTexture, PerspectiveCamera, RoundedBox, MeshTransmissionMaterial, MeshDistortMaterial, Cylinder, Box, useVideoTexture, Lightformer, Sphere } from '@react-three/drei';
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { usePinch } from '@use-gesture/react';

export const GyroState = { enabled: false, alpha: 0, beta: 0, gamma: 0 };
import { motion, AnimatePresence } from 'motion/react';
import { useSpring as useFramerSpring } from 'framer-motion';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  voiceNoteUrl?: string; // Additional audio for images
  title?: string;
  duration?: string;
}

export interface XsoReceiverSanctumProps {
  auraWeight?: [number, number]; 
  masterAudioUrl: string;
  media: MediaItem[];
  onComplete: () => void;
}

function InspectableArtifact({ children, isCurrent, onInteractStart, onInteractEnd, onClick }: any) {
  const rotX = useFramerSpring(0, { stiffness: 80, damping: 20 });
  const rotY = useFramerSpring(0, { stiffness: 80, damping: 20 });
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (groupRef.current) {
      if (!isDragging.current && GyroState.enabled && isCurrent) {
        const pitchOffset = GyroState.beta - 45;
        const targetRotX = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(pitchOffset), -0.26, 0.26);
        const targetRotY = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(GyroState.gamma), -0.26, 0.26);
        rotX.set(targetRotX);
        rotY.set(targetRotY);
      }
      groupRef.current.rotation.x = rotX.get();
      groupRef.current.rotation.y = rotY.get();
    }
  });

  const handlePointerDown = (e: any) => {
    if (!isCurrent) return;
    e.stopPropagation();
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    onInteractStart?.();
    (e.target as any).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isCurrent || !isDragging.current) return;
    e.stopPropagation();
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    rotX.set(dy * 0.01);
    rotY.set(dx * 0.01);
  };

  const handlePointerUp = (e: any) => {
    if (!isCurrent) return;
    e.stopPropagation();

    if (isDragging.current) {
      isDragging.current = false;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
         onClick?.();
      }
    }
    
    rotX.set(0);
    rotY.set(0);
    setTimeout(() => {
      onInteractEnd?.();
    }, 50);
    (e.target as any).releasePointerCapture(e.pointerId);
  };

  return (
    <group 
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOut={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </group>
  );
}

function PolaroidSlab({ item, position, isCurrent, onInteractStart, onInteractEnd }: any) {
    const texture = useTexture(item.url) as THREE.Texture;
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime()) * 0.2;
        }
    });

    return (
        <group position={position} ref={groupRef}>
            <InspectableArtifact isCurrent={isCurrent} onInteractStart={onInteractStart} onInteractEnd={onInteractEnd}>
              <RoundedBox args={[3.2, 4.2, 0.2]} radius={0.05}>
                 <meshStandardMaterial color="#111" roughness={0.8} />
              </RoundedBox>
              <mesh position={[0, 0, 0.101]}>
                 <planeGeometry args={[3.0, 4.0]} />
                 <meshPhysicalMaterial map={texture} clearcoat={1} roughness={0.1} />
              </mesh>
            </InspectableArtifact>
            {item.title && (
                 <Html position={[0, -2.5, 0]} center style={{ pointerEvents: 'none', opacity: isCurrent ? 1 : 0, transition: 'opacity 0.5s' }}>
                     <div style={{ width: '80vw', maxWidth: '300px', textAlign: 'center' }}>
                         <h3 className="text-white text-sm tracking-widest uppercase font-mono opacity-50 break-words">{item.title}</h3>
                     </div>
                 </Html>
            )}
        </group>
    )
}

function MiniPearl({ isActive, color }: { isActive: boolean; color: string }) {
  const innerRef = useRef<any>(null);
  useFrame((state, delta) => {
    if (innerRef.current) {
        const tDistort = isActive ? 0.6 : 0.2;
        const tSpeed = isActive ? 5 : 1;
        innerRef.current.distort = THREE.MathUtils.lerp(innerRef.current.distort, tDistort, delta * 5);
        innerRef.current.speed = THREE.MathUtils.lerp(innerRef.current.speed, tSpeed, delta * 5);
    }
  });
  return (
    <group>
      <Sphere args={[0.5, 32, 32]}>
         <MeshTransmissionMaterial transmission={1} thickness={1} roughness={0.05} ior={1.5} color="#111" transparent backside />
      </Sphere>
      <Sphere args={[0.3, 64, 64]}>
         <MeshDistortMaterial ref={innerRef} color={color} emissive={color} emissiveIntensity={isActive ? 3 : 1} distort={0.2} speed={1} />
      </Sphere>
      <pointLight color={color} intensity={isActive ? 2 : 0.5} distance={5} />
    </group>
  );
}

function CassetteArchive({ item, position, isCurrent, onInteractStart, onInteractEnd }: any) {
   const [isPlaying, setIsPlaying] = useState(false);
   const audioRef = useRef<HTMLAudioElement | null>(null);
   const playPromiseRef = useRef<Promise<void> | undefined>(undefined);

   useEffect(() => {
     const audio = new Audio(item.url);
     audio.crossOrigin = 'anonymous';
     audioRef.current = audio;
     return () => {
         if (playPromiseRef.current !== undefined) {
             const p = playPromiseRef.current;
             p.then(() => {
                 if (playPromiseRef.current === p) {
                     audio.pause();
                     audio.src = '';
                 }
             }).catch(() => {});
         } else {
             audio.pause();
             audio.src = '';
         }
     }
   }, [item.url]);

   useEffect(() => {
     if (!isCurrent) {
        setIsPlaying(false);
        const audio = audioRef.current;
        if (audio) {
            if (playPromiseRef.current !== undefined) {
                const p = playPromiseRef.current;
                p.then(() => {
                    if (playPromiseRef.current === p) {
                        audio.pause();
                    }
                }).catch(() => {});
            } else {
                audio.pause();
            }
        }
     }
   }, [isCurrent]);

   const togglePlay = () => {
     const audio = audioRef.current;
     if (!audio) return;

     if (isPlaying) {
         if (playPromiseRef.current !== undefined) {
             const p = playPromiseRef.current;
             p.then(() => {
                 if (playPromiseRef.current === p) {
                     audio.pause();
                 }
             }).catch(() => {});
         } else {
             audio.pause();
         }
         setIsPlaying(false);
     } else {
         const p = audio.play();
         if (p !== undefined) {
            playPromiseRef.current = p;
            p.catch(() => { setIsPlaying(false); });
         }
         setIsPlaying(true);
     }
   };

   return (
     <group position={position}>
         <InspectableArtifact isCurrent={isCurrent} onInteractStart={onInteractStart} onInteractEnd={onInteractEnd} onClick={togglePlay}>
            {/* Cartridge Case */}
            <RoundedBox args={[3.5, 2, 1.2]} radius={0.1}>
              <MeshTransmissionMaterial transmission={1} thickness={0.5} roughness={0.05} color="#2a2a2a" />
            </RoundedBox>
            <Box args={[2.5, 1, 0.8]} position={[0,0,-0.1]}>
               <meshStandardMaterial color="#050505" roughness={0.9} />
            </Box>
            <group position={[0, 0, 0.2]}>
               <MiniPearl isActive={isPlaying} color={isPlaying ? "#00ffff" : "#ff0055"} />
            </group>
         </InspectableArtifact>
         
         {item.title && (
            <Html position={[0, -2, 0]} center style={{ pointerEvents: 'none', opacity: isCurrent ? 1 : 0, transition: 'opacity 0.5s' }}>
                <div style={{ width: '80vw', maxWidth: '300px', textAlign: 'center' }}>
                    <h3 className="text-white text-sm tracking-widest uppercase font-mono opacity-50 break-words">{item.title}</h3>
                    <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase mt-2 text-center">{isPlaying ? 'PLAYING' : 'TAP TO PLAY'}</p>
                </div>
            </Html>
         )}
     </group>
   );
}

function IMAXMonolith({ item, position, isCurrent, onInteractStart, onInteractEnd }: any) {
    const texture = useVideoTexture(item.url, { crossOrigin: 'anonymous', muted: !isCurrent, loop: true, start: false });
    const playPromiseRef = useRef<Promise<void> | undefined>(undefined);
    
    const lightRef = useRef<THREE.PointLight>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const targetColor = useRef(new THREE.Color(1, 1, 1));
    
    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        canvasRef.current = canvas;
        ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
    }, []);

    useFrame((state, delta) => {
        if (!isCurrent || !lightRef.current || !texture.image || !ctxRef.current) return;
        const vid = texture.image as HTMLVideoElement;
        
        if (vid.readyState >= 2 && !vid.paused) {
             try {
                 const ctx = ctxRef.current;
                 ctx.drawImage(vid, 0, 0, 1, 1);
                 const data = ctx.getImageData(0, 0, 1, 1).data;
                 targetColor.current.setRGB(data[0] / 255, data[1] / 255, data[2] / 255);
                 
                 const hsl = { h: 0, s: 0, l: 0 };
                 targetColor.current.getHSL(hsl);
                 if (hsl.l < 0.25) {
                     hsl.l = 0.25; 
                 }
                 targetColor.current.setHSL(hsl.h, Math.min(hsl.s * 1.5, 1.0), hsl.l);
             } catch (e) {
                 // safe ignore cross-origin failures
             }
        }
        
        lightRef.current.color.lerp(targetColor.current, delta * 5);
    });

    useEffect(() => {
        if (texture.image) {
           const vid = texture.image as HTMLVideoElement;
           if (isCurrent) {
               vid.muted = false;
               const p = vid.play();
               if (p !== undefined) {
                   playPromiseRef.current = p;
                   p.catch(()=>{});
               }
           } else {
               vid.muted = true;
               if (playPromiseRef.current !== undefined) {
                   const p = playPromiseRef.current;
                   p.then(() => {
                       if (playPromiseRef.current === p) {
                           vid.pause();
                       }
                   }).catch(()=>{});
               } else {
                   vid.pause();
               }
           }
        }
    }, [isCurrent, texture]);

    return (
        <group position={position}>
            <InspectableArtifact isCurrent={isCurrent} onInteractStart={onInteractStart} onInteractEnd={onInteractEnd}>
                <Cylinder args={[10, 10, 12, 64, 1, true, Math.PI / 2, Math.PI]}>
                    <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
                </Cylinder>
            </InspectableArtifact>
            {isCurrent && <pointLight ref={lightRef} color="#ffffff" intensity={1} distance={30} position={[0, 0, 8]} />}
            {item.title && (
                 <Html position={[0, -7, 0]} center style={{ pointerEvents: 'none', opacity: isCurrent ? 1 : 0, transition: 'opacity 0.5s' }}>
                     <div style={{ width: '80vw', maxWidth: '400px', textAlign: 'center' }}>
                         <h3 className="text-white text-sm tracking-widest uppercase font-mono opacity-50 break-words">{item.title}</h3>
                     </div>
                 </Html>
            )}
        </group>
    )
}

export function getObjectPosition(index: number): [number, number, number] {
  if (index === 0) return [0, 0, 0];
  const x = index % 2 !== 0 ? 8 : -8;
  const y = index % 2 !== 0 ? 3 : -2;
  const z = index * -60;
  return [x, y, z];
}

function CameraRig({ targetPosition, targetLookAt, targetFov = 35 }: { targetPosition: [number, number, number], targetLookAt: [number, number, number], targetFov?: number }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const springConfig = { stiffness: 20, damping: 20 };
  const camX = useFramerSpring(targetPosition[0], springConfig);
  const camY = useFramerSpring(targetPosition[1], springConfig);
  const camZ = useFramerSpring(targetPosition[2], springConfig);

  const lookX = useFramerSpring(targetLookAt[0], { stiffness: 30, damping: 20 });
  const lookY = useFramerSpring(targetLookAt[1], { stiffness: 30, damping: 20 });
  const lookZ = useFramerSpring(targetLookAt[2], { stiffness: 30, damping: 20 });

  const camFov = useFramerSpring(targetFov, { stiffness: 40, damping: 20 });

  useEffect(() => {
    camX.set(targetPosition[0]);
    camY.set(targetPosition[1]);
    camZ.set(targetPosition[2]);
  }, [targetPosition, camX, camY, camZ]);

  useEffect(() => {
    lookX.set(targetLookAt[0]);
    lookY.set(targetLookAt[1]);
    lookZ.set(targetLookAt[2]);
  }, [targetLookAt, lookX, lookY, lookZ]);

  useEffect(() => {
    camFov.set(targetFov);
  }, [targetFov, camFov]);

  const internalLookAt = useRef(new THREE.Vector3());

  const pointerOffset = useRef(new THREE.Vector2(0, 0));

  useFrame((state, delta) => {
    if (!cameraRef.current || !lightRef.current) return;

    const driftX = Math.sin(state.clock.elapsedTime * 0.4) * 0.6;
    const driftY = Math.cos(state.clock.elapsedTime * 0.3) * 0.4;
    
    cameraRef.current.position.set(
      camX.get() + driftX,
      camY.get() + driftY,
      camZ.get()
    );

    lightRef.current.position.copy(cameraRef.current.position);

    const targetPointerX = state.pointer.x * 6; // allow looking left/right
    const targetPointerY = state.pointer.y * 4;
    pointerOffset.current.x = THREE.MathUtils.lerp(pointerOffset.current.x, targetPointerX, delta * 3.5);
    pointerOffset.current.y = THREE.MathUtils.lerp(pointerOffset.current.y, targetPointerY, delta * 3.5);

    internalLookAt.current.set(
       lookX.get() + pointerOffset.current.x, 
       lookY.get() + pointerOffset.current.y, 
       lookZ.get()
    );
    cameraRef.current.lookAt(internalLookAt.current);

    cameraRef.current.fov = camFov.get();
    cameraRef.current.updateProjectionMatrix();
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={35} />
      <pointLight ref={lightRef} intensity={1.5} distance={50} color="#fff" />
    </>
  );
}

export default function XsoReceiverSanctum({ auraWeight = [1, 1], masterAudioUrl, media, onComplete }: XsoReceiverSanctumProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Audio Context exact from original
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    if (!AudioContextClass) return;

    const actx = new AudioContextClass();
    audioContextRef.current = actx;

    const masterAudio = new Audio(masterAudioUrl);
    masterAudio.crossOrigin = "anonymous";
    masterAudio.loop = true;
    masterAudio.volume = 1;
    masterAudioRef.current = masterAudio;

    const gainNode = actx.createGain();
    masterGainRef.current = gainNode;
    
    const source = actx.createMediaElementSource(masterAudio);
    source.connect(gainNode);
    gainNode.connect(actx.destination);

    return () => {
      if (masterAudioRef.current) {
        masterAudioRef.current.pause();
        masterAudioRef.current.src = "";
      }
      if (actx.state !== 'closed') actx.close().catch(()=>{});
    };
  }, [masterAudioUrl]);

  // Ducking logic
  useEffect(() => {
    const actx = audioContextRef.current;
    const gainNode = masterGainRef.current;

    if (actx && gainNode && actx.state === 'suspended') {
      actx.resume();
    }
    // We duck heavily based on index. Index 0 is pearl.
    if (gainNode && actx) {
         gainNode.gain.setTargetAtTime(0.3, actx.currentTime, 1.0);
    }
  }, [currentIndex]);

  const totalStops = media.length;
  
  const currentObjPos = getObjectPosition(currentIndex);
  const targetPosition: [number, number, number] = [currentObjPos[0], currentObjPos[1], currentObjPos[2] + 15];
  const targetLookAt: [number, number, number] = [currentObjPos[0], currentObjPos[1], currentObjPos[2]];

  const [targetFov, setTargetFov] = useState(35);
  const isInteracting = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef(0);
  
  usePinch(({ offset: [s], event }) => {
    // Prevent default zoom
    event.preventDefault();
    const newFov = 35 - ((s - 1) * 20); // Scale 1 = 35. Scale 1.5 = 25 (zoom in). Scale 0.5 = 45 (zoom out)
    setTargetFov(THREE.MathUtils.clamp(newFov, 20, 55));
  }, { target: containerRef, scaleBounds: { min: 0.2, max: 3 }, eventOptions: { passive: false } });

  const [gyroEnabled, setGyroEnabled] = useState(false);
  const toggleGyro = async () => {
    if (!gyroEnabled) {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
         try {
           const permission = await (DeviceOrientationEvent as any).requestPermission();
           if (permission === 'granted') {
             setGyroEnabled(true);
           }
         } catch(e) {
             console.error(e);
         }
      } else {
         setGyroEnabled(true);
      }
    } else {
      setGyroEnabled(false);
    }
  };

  useEffect(() => {
    GyroState.enabled = gyroEnabled;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      GyroState.alpha = e.alpha || 0;
      GyroState.beta = e.beta || 0;
      GyroState.gamma = e.gamma || 0;
    };
    if (gyroEnabled) {
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      GyroState.alpha = 0; GyroState.beta = 0; GyroState.gamma = 0;
    }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [gyroEnabled]);
  
  const handleScroll = (dir: number) => {
    if (isInteracting.current) return;
    const nextIndex = currentIndex + dir;

    if (nextIndex < 0 || nextIndex >= totalStops) {
      if (nextIndex >= totalStops) {
        onComplete();
      }
      return;
    }
    
    if (navigator.vibrate) navigator.vibrate([50, 40, 100]);
    
    setCurrentIndex(nextIndex);

    setTimeout(() => {
       if (navigator.vibrate) navigator.vibrate([20]);
    }, 1500);
  };

  // Wheel interaction
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 800) return; // heavy debounce for cinematic feel

    if (Math.abs(e.deltaY) > 50) {
      const dir = e.deltaY > 0 ? 1 : -1;
      handleScroll(dir);
      lastWheelTime.current = now;
    }
  };

  // Pointer interaction
  const pointerStartInfo = useRef({ x: 0, y: 0, time: 0 });
  const [isTouching, setIsTouching] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isInteracting.current) return;
    pointerStartInfo.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsTouching(true);
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if(!isTouching || isInteracting.current) return;
    setIsTouching(false);
    
    const deltaY = e.clientY - pointerStartInfo.current.y;
    const deltaX = e.clientX - pointerStartInfo.current.x;
    const deltaTime = Date.now() - pointerStartInfo.current.time;
    
    // Swipe threshold
    if (Math.abs(deltaY) > 100 && Math.abs(deltaY) > Math.abs(deltaX) && deltaTime < 1000) {
      const dir = deltaY < 0 ? 1 : -1; // Swipe up = negative deltaY = go forward
      handleScroll(dir);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 bg-[#030105] font-sans touch-none select-none overflow-hidden"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      // R3F handles the rest of pointer events through capturing on elements
    >

      <div className="absolute top-6 right-6 z-50">
         <button 
            onClick={toggleGyro}
            className="text-white/50 text-[10px] tracking-[0.3em] uppercase py-2 px-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
         >
            [ GYRO: {gyroEnabled ? 'ON' : 'OFF'} ]
         </button>
      </div>

      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}>
        <color attach="background" args={['#030105']} />
        <fog attach="fog" args={['#030105', 10, 40]} />
        <Environment preset="studio" environmentIntensity={0.1}>
          {/* Nebula-like reflections for the dark glass */}
          <Lightformer form="circle" intensity={1.5} color="#ff00cc" position={[10, 5, 5]} scale={20} />
          <Lightformer form="circle" intensity={2} color="#00ffff" position={[-10, 5, 5]} scale={20} />
          <Lightformer form="circle" intensity={1} color="#ff0000" position={[0, 10, -5]} scale={20} />
        </Environment>

        <CameraRig targetPosition={targetPosition} targetLookAt={targetLookAt} targetFov={targetFov} />

        <React.Suspense fallback={null}>
            {media.map((item, i) => {
              const pos = getObjectPosition(i);
              const isCurrent = currentIndex === i;
              return (
                <group key={item.id}>
                  {item.type === 'image' && <PolaroidSlab item={item} position={pos} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                  {item.type === 'audio' && <CassetteArchive item={item} position={pos} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                  {item.type === 'video' && <IMAXMonolith item={item} position={pos} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                </group>
              );
            })}
        </React.Suspense>

        <EffectComposer>
          <Vignette darkness={0.7} />
          <Bloom luminanceThreshold={0.5} intensity={1.5} />
        </EffectComposer>
      </Canvas>

      {/* Progress indicators */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none z-50">
        <div className="flex gap-2.5">
          {Array.from({ length: totalStops }).map((_, i) => (
            <div 
              key={i} 
              className={`w-[5px] h-[5px] rounded-full transition-all duration-700 ${i === currentIndex ? 'bg-white scale-[1.8]' : 'bg-white/30'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
