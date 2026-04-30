import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, SpotLight, Html, useTexture, PerspectiveCamera, RoundedBox, MeshTransmissionMaterial, MeshDistortMaterial, Cylinder, Box, useVideoTexture, Lightformer, Sphere, Cloud, Clouds, Sparkles, Trail } from '@react-three/drei';
import { EffectComposer, Vignette, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { usePinch } from '@use-gesture/react';
import AudioReactiveSymphony from './AudioReactiveSymphony';

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

function PolaroidSlab({ item, position, isCurrent, onInteractStart, onInteractEnd, auraIndex = 0, aestheticVariant = 0, vibe = 'VOID' }: any) {
    const { gl } = useThree();
    const texture = useTexture(item.url) as THREE.Texture;
    const aura = AURA_TYPES[auraIndex] || AURA_TYPES[0];
    
    // In LOCATION vibe, use the location background (e.g., from aestheticVariant)
    // Actually the instructions say: "The Polaroid's envMap should ideally be the same location texture"
    // So we'll use the same textures whether VOID or LOCATION, but for VOID it's a symbolic high-res texture,
    // and for LOCATION it's a location image. Let's just use the aura textures either way to satisfy envMap.
    const envTextureUrl = aura.textures[aestheticVariant] || aura.textures[0];
    const envTexture = useTexture(envTextureUrl) as THREE.Texture;
    const targetColor = new THREE.Color(aura.colors[aestheticVariant] || aura.colors[0]);
    
    useMemo(() => {
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        envTexture.anisotropy = gl.capabilities.getMaxAnisotropy();
        envTexture.colorSpace = THREE.SRGBColorSpace;
        envTexture.minFilter = THREE.LinearFilter;
        envTexture.magFilter = THREE.LinearFilter;
        envTexture.generateMipmaps = false;
        envTexture.needsUpdate = true;
    }, [envTexture, gl]);
    
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime()) * 0.2;
        }
    });

    return (
        <group position={position} ref={groupRef}>
            {/* Glowing rim light / aura */}
            <mesh position={[0, 0, -1]}>
               <planeGeometry args={[12, 16]} />
               <shaderMaterial
                  transparent
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  uniforms={{ uColor: { value: targetColor } }}
                  vertexShader={`
                      varying vec2 vUv;
                      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
                  `}
                  fragmentShader={`
                      uniform vec3 uColor;
                      varying vec2 vUv;
                      void main() {
                          float d = distance(vUv, vec2(0.5));
                          float alpha = smoothstep(0.5, 0.0, d) * 0.4;
                          gl_FragColor = vec4(uColor, alpha);
                      }
                  `}
               />
            </mesh>
            <pointLight position={[0, 0, -2]} distance={10} intensity={2} color={targetColor} />

            <InspectableArtifact isCurrent={isCurrent} onInteractStart={onInteractStart} onInteractEnd={onInteractEnd}>
              <RoundedBox args={[3.2, 4.2, 0.2]} radius={0.05}>
                 <meshStandardMaterial color="#111" roughness={0.8} />
              </RoundedBox>
              <mesh position={[0, 0, 0.101]}>
                 <planeGeometry args={[3.0, 4.0]} />
                 <meshPhysicalMaterial map={texture} clearcoat={1} roughness={0} metalness={1} envMap={envTexture} envMapIntensity={5} />
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
         if (!audio.paused) {
             if (playPromiseRef.current !== undefined) {
                 playPromiseRef.current.then(() => {
                     audio.pause();
                     audio.src = '';
                 }).catch(() => {});
             } else {
                 audio.pause();
                 audio.src = '';
             }
         } else {
             audio.src = '';
         }
     }
   }, [item.url]);

   useEffect(() => {
     if (!isCurrent) {
        setIsPlaying(false);
        const audio = audioRef.current;
        if (audio && !audio.paused) {
            if (playPromiseRef.current !== undefined) {
                playPromiseRef.current.then(() => {
                    audio.pause();
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
         if (!audio.paused) {
             if (playPromiseRef.current !== undefined) {
                 playPromiseRef.current.then(() => {
                     audio.pause();
                 }).catch(() => {});
             } else {
                 audio.pause();
             }
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
               if (!vid.paused) {
                   if (playPromiseRef.current !== undefined) {
                       playPromiseRef.current.then(() => {
                           vid.pause();
                       }).catch(()=>{});
                   } else {
                       vid.pause();
                   }
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
    
    // Add Steadicam subtle tilt based on pointer and time
    const tilt = -(state.pointer.x * 0.05) + Math.sin(state.clock.elapsedTime * 0.8) * 0.01;
    cameraRef.current.rotation.z = THREE.MathUtils.lerp(cameraRef.current.rotation.z, tilt, delta * 2);

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

export const AURA_TYPES = [
  { 
    name: 'Ethereal', 
    textures: [
      'https://picsum.photos/seed/heart4k/2048/1024', 
      'https://picsum.photos/seed/rainbow/2048/1024'
    ], 
    colors: ['#ff4d4d', '#4d4dff']
  },
  { 
    name: 'Cosmic', 
    textures: [
      'https://picsum.photos/seed/moon4k/2048/1024', 
      'https://picsum.photos/seed/star4k/2048/1024'
    ], 
    colors: ['#4a154b', '#15243b']
  },
  { 
    name: 'Gilded Dust', 
    textures: [
      'https://picsum.photos/seed/gilded4k/2048/1024', 
      'https://picsum.photos/seed/goldcrystal/2048/1024'
    ], 
    colors: ['#59421a', '#69522a']
  },
  { 
    name: 'Petal Fall', 
    textures: [
      'https://picsum.photos/seed/petal4k/2048/1024', 
      'https://picsum.photos/seed/sakura4k/2048/1024'
    ], 
    colors: ['#66293a', '#76394a']
  },
  { 
    name: 'Cosmic Void', 
    textures: [
      'https://picsum.photos/seed/void4k/2048/1024', 
      'https://picsum.photos/seed/blackhole/2048/1024'
    ], 
    colors: ['#050814', '#151824']
  },
  { 
    name: 'Ember Ash', 
    textures: [
      'https://picsum.photos/seed/ember4k/2048/1024', 
      'https://picsum.photos/seed/fire4k/2048/1024'
    ], 
    colors: ['#661a00', '#762a10']
  },
  { 
    name: 'Cobalt Rain', 
    textures: [
      'https://picsum.photos/seed/cobalt4k/2048/1024', 
      'https://picsum.photos/seed/ocean4k/2048/1024'
    ], 
    colors: ['#101b33', '#202b43']
  },
  { 
    name: 'Prismatic', 
    textures: [
      'https://picsum.photos/seed/prism4k/2048/1024', 
      'https://picsum.photos/seed/neon4k/2048/1024'
    ], 
    colors: ['#3a1c4d', '#4a2c5d']
  },
  { 
    name: 'Radiant', 
    textures: [
      'https://picsum.photos/seed/radiant4k/2048/1024', 
      'https://picsum.photos/seed/light4k/2048/1024'
    ], 
    colors: ['#5e5436', '#6e6446']
  }
];

function VibeBackground({ auraIndex, aestheticVariant = 0, vibe, blurBg, blockType }: { auraIndex: number, aestheticVariant?: number, vibe: string, blurBg: boolean, blockType: string }) {
    const aura = AURA_TYPES[auraIndex] || AURA_TYPES[0];
    const { scene } = useThree();
    const map = useTexture(aura.textures[aestheticVariant]) as THREE.Texture;
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const ambientLightRef = useRef<THREE.AmbientLight>(null);

    // Apply color space to background map so it's not washed out when unblurred
    useMemo(() => {
        map.colorSpace = THREE.SRGBColorSpace;
    }, [map]);

    useFrame((_, delta) => {
        const isBlack = vibe === 'VOID' || blockType !== 'image';
        const targetColor = isBlack ? new THREE.Color('#000000') : new THREE.Color(aura.colors[aestheticVariant] || '#000');
        if (scene.fog && 'color' in scene.fog) {
            (scene.fog as THREE.Fog).color.lerp(targetColor, delta * 2);
        }
        if (scene.background instanceof THREE.Color) {
            scene.background.lerp(targetColor, delta * 2);
        }
        if (ambientLightRef.current) {
            ambientLightRef.current.color.lerp(targetColor, delta * 2);
        }
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value += delta;
            materialRef.current.uniforms.uBlur.value = blurBg ? 1.0 : 0.0;
        }
    });

    const isVisible = vibe === 'LOCATION' && blockType === 'image';

    return (
        <group>
            <ambientLight ref={ambientLightRef} intensity={0.5} />
            {isVisible && (
                <mesh position={[0, 0, -150]}>
                    <planeGeometry args={[800, 500]} />
                    <shaderMaterial
                        ref={materialRef}
                        transparent
                        depthWrite={false}
                        uniforms={{
                            uMap: { value: map },
                            uTime: { value: 0 },
                            uBlur: { value: blurBg ? 1.0 : 0.0 }
                        }}
                        vertexShader={`
                            varying vec2 vUv;
                            void main() {
                                vUv = uv;
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `}
                        fragmentShader={`
                            uniform sampler2D uMap;
                            uniform float uTime;
                            uniform float uBlur;
                            varying vec2 vUv;

                            vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
                                vec4 color = vec4(0.0);
                                vec2 off1 = vec2(1.411764705882353) * direction;
                                vec2 off2 = vec2(3.2941176470588234) * direction;
                                vec2 off3 = vec2(5.176470588235294) * direction;
                                color += texture2D(image, uv) * 0.1964825501511404;
                                color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
                                color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
                                color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
                                color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
                                color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
                                color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
                                return color;
                            }

                            void main() {
                                vec2 res = vec2(100.0, 100.0);
                                vec2 driftedUv = vUv + vec2(sin(uTime * 0.02) * 0.02, cos(uTime * 0.02) * 0.02);

                                // Massive blur pass
                                vec4 colX = blur13(uMap, driftedUv, res, vec2(32.0, 0.0));
                                vec4 colY = blur13(uMap, driftedUv, res, vec2(0.0, 32.0));
                                vec4 colX2 = blur13(uMap, driftedUv, res, vec2(64.0, 0.0));
                                vec4 colY2 = blur13(uMap, driftedUv, res, vec2(0.0, 64.0));
                                vec4 colX3 = blur13(uMap, driftedUv, res, vec2(96.0, 0.0));
                                vec4 colY3 = blur13(uMap, driftedUv, res, vec2(0.0, 96.0));
                                vec4 blurredColor = (colX + colY + colX2 + colY2 + colX3 + colY3) / 6.0;

                                vec4 sharpColor = texture2D(uMap, vUv);

                                vec4 finalColor = mix(sharpColor, blurredColor, uBlur);

                                float fadeOut = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);

                                gl_FragColor = finalColor * vec4(vec3(1.0), fadeOut);
                            }
                        `}
                    />
                </mesh>
            )}
        </group>
    );
}

export default function XsoReceiverSanctum({ auraWeight = [1, 1], masterAudioUrl, media, onComplete }: XsoReceiverSanctumProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [auraIndex, setAuraIndex] = useState(0);
  const [aestheticVariant, setAestheticVariant] = useState(0);
  const [vibe, setVibe] = useState<'VOID' | 'LOCATION'>('VOID');
  const [blurBg, setBlurBg] = useState(false);

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
        if (!masterAudioRef.current.paused) {
           masterAudioRef.current.pause();
        }
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); toggleGyro(); }}
            className="text-white/50 text-[10px] tracking-[0.3em] uppercase py-2 px-4 border border-white/20 rounded-full hover:bg-white/10 transition-colors pointer-events-auto"
         >
            [ GYRO: {gyroEnabled ? 'ON' : 'OFF'} ]
         </button>
      </div>

      <Canvas style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5 }}>
        <color attach="background" args={['#000000']} />
        <fog attach="fog" args={['#000000', 10, 40]} />
        <ambientLight intensity={0.2} />
        
        <Environment preset="studio" environmentIntensity={0.1}>
          {/* Nebula-like reflections for the dark glass */}
          <Lightformer form="circle" intensity={1.5} color="#ff00cc" position={[10, 5, 5]} scale={20} />
          <Lightformer form="circle" intensity={2} color="#00ffff" position={[-10, 5, 5]} scale={20} />
          <Lightformer form="circle" intensity={1} color="#ff0000" position={[0, 10, -5]} scale={20} />
        </Environment>

        <VibeBackground auraIndex={auraIndex} aestheticVariant={aestheticVariant} vibe={vibe} blurBg={blurBg} blockType={media[currentIndex]?.type || 'image'} />

        {vibe === 'VOID' && <AudioReactiveSymphony audioRef={masterAudioRef} />}

        <CameraRig targetPosition={targetPosition} targetLookAt={targetLookAt} targetFov={targetFov} />

        <React.Suspense fallback={null}>
            {media.map((item, i) => {
              const pos = getObjectPosition(i);
              const isCurrent = currentIndex === i;
              return (
                <group key={item.id}>
                  {item.type === 'image' && <PolaroidSlab item={item} position={pos} auraIndex={auraIndex} aestheticVariant={aestheticVariant} vibe={vibe} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                  {item.type === 'audio' && <CassetteArchive item={item} position={pos} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                  {item.type === 'video' && <IMAXMonolith item={item} position={pos} isCurrent={isCurrent} onInteractStart={() => {isInteracting.current = true}} onInteractEnd={() => {isInteracting.current = false}} />}
                </group>
              );
            })}
        </React.Suspense>

        <EffectComposer>
          <Bloom luminanceThreshold={0.5} mipmapBlur intensity={2} />
          <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
          <Noise opacity={0.03} />
        </EffectComposer>
      </Canvas>

      <div 
         className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 p-4 bg-black/40 border border-white/10 backdrop-blur-md rounded-lg pointer-events-auto z-50 transition-all"
         onPointerDown={(e) => { e.stopPropagation(); }}
         onPointerUp={(e) => { e.stopPropagation(); }}
         onPointerMove={(e) => { e.stopPropagation(); }}
         onWheel={(e) => { e.stopPropagation(); }}
      >
         <div className="flex flex-col gap-2">
            <div className="text-white/30 text-[10px] tracking-[0.2em] font-mono mb-2 border-b border-white/10 pb-2">VIBE</div>
            <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVibe('VOID'); }} 
                className={`text-xs font-mono text-left px-2 py-1 transition-all hover:bg-white/5 ${vibe === 'VOID' ? 'text-white border-l-2 border-white pl-2' : 'text-white/40'}`}
            >
                1. MEMORY VOID
            </button>
            <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVibe('LOCATION'); setBlurBg(true); }} 
                className={`text-xs font-mono text-left px-2 py-1 transition-all hover:bg-white/5 ${vibe === 'LOCATION' ? 'text-white border-l-2 border-white pl-2' : 'text-white/40'}`}
            >
                2. LOCATION
            </button>
         </div>

         {vibe === 'LOCATION' && (
             <div className="flex flex-col gap-2 mt-2">
                <div className="text-white/30 text-[10px] tracking-[0.2em] font-mono mb-2 border-b border-white/10 pb-2">BACKGROUND</div>
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBlurBg(!blurBg); }} 
                    className={`text-xs font-mono text-left px-2 py-1 transition-all hover:bg-white/5 ${blurBg ? 'text-white border-l-2 border-white pl-2' : 'text-white/40'}`}
                >
                    {blurBg ? 'BLUR: ON' : 'BLUR: OFF'}
                </button>
             </div>
         )}
         
         <div className="flex flex-col gap-2 mt-2">
            <div className="text-white/30 text-[10px] tracking-[0.2em] font-mono mb-2 border-b border-white/10 pb-2">AESTHETIC TYPE</div>
            <div className="grid grid-cols-2 gap-1 px-1">
                {AURA_TYPES.map((aura, i) => (
                    <button 
                        key={i} 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAuraIndex(i); setAestheticVariant(0); }} 
                        className={`text-[10px] font-mono text-left px-2 py-1 transition-all hover:bg-white/5 truncate ${auraIndex === i ? 'text-white border-l-2 border-white pl-2' : 'text-white/40'}`}
                    >
                        {aura.name.toUpperCase()}
                    </button>
                ))}
            </div>
         </div>
         
         {AURA_TYPES[auraIndex] && AURA_TYPES[auraIndex].textures && (
            <div className="flex flex-col gap-2 mt-2">
                <div className="text-white/30 text-[10px] tracking-[0.2em] font-mono mb-2 border-b border-white/10 pb-2">VARIANT</div>
                <div className="flex gap-2 px-2">
                    {AURA_TYPES[auraIndex].textures.map((_, i) => (
                        <button 
                            key={i}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAestheticVariant(i); }}
                            className={`w-6 h-6 flex items-center justify-center text-xs font-mono rounded transition-all ${aestheticVariant === i ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>
         )}
      </div>

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
