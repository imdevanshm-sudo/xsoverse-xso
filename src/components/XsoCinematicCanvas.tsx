import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'motion/react';
import { XsoAudioOrb } from './XsoAudioOrb';
import { XsoVideoWindow } from './XsoVideoWindow';

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  voiceNoteUrl?: string; // Additional audio for images
  title?: string;
  duration?: string;
}

export interface XsoCinematicCanvasProps {
  auraWeight?: [number, number]; 
  masterAudioUrl: string;
  media: MediaItem[];
  onComplete: () => void;
}

// --------------------------------------------------------
// SUB-COMPONENTS
// --------------------------------------------------------

function PolaroidCard({ item, smoothRotX, smoothRotY, glareX, glareY, glareOpacity, hasRotated3D }: any) {
  return (
    <div className="relative w-[85vw] md:w-[45vw] aspect-[3/4] max-h-[80vh] pointer-events-auto cursor-grab active:cursor-grabbing">
      <motion.div 
        className="absolute inset-0"
        style={{
          rotateX: smoothRotX,
          rotateY: smoothRotY,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-0 rounded-xl overflow-visible" style={{ transformStyle: 'preserve-3d' }}>
          
          {/* FRONT FACE */}
          <div 
            className="absolute inset-0 bg-[#F3F4F6] rounded-xl shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.05)] border border-white/40 p-3 pb-16 md:p-5 md:pb-20 flex flex-col transform-gpu"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(1px)' }}
          >
            <div className="w-full flex-1 relative rounded-md overflow-hidden bg-black shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
              <img 
                src={item.url} 
                alt="Memory"
                className="w-full h-full object-cover absolute inset-0"
                draggable={false}
              />
              {/* Dynamic Glossy Glare */}
              <motion.div 
                className="absolute inset-0 pointer-events-none mix-blend-overlay"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%)',
                  x: glareX,
                  y: glareY,
                  opacity: glareOpacity,
                }}
              />
            </div>
            
            {/* Polaroid Description Text */}
            <div className="h-10 md:h-12 mt-3 md:mt-4 flex items-center justify-center shrink-0 px-2 overflow-hidden">
              <p className="text-gray-800 font-serif italic text-sm md:text-base text-center line-clamp-2 leading-tight opacity-80 select-none">
                {item.title || "A fragmented memory..."}
              </p>
            </div>
          </div>

          {/* BACK FACE */}
          <div 
            className="absolute inset-0 bg-[#E5E7EB] rounded-xl border border-black/10 flex items-center justify-center pointer-events-none"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}
          >
              <p className="text-gray-400 font-serif italic text-sm tracking-widest opacity-80 mix-blend-multiply">XSO Archive</p>
          </div>

        </div>
      </motion.div>

      <AnimatePresence>
        {!hasRotated3D && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute -bottom-16 left-0 right-0 flex justify-center pointer-events-none"
          >
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/40 drop-shadow-md">Drag To Inspect</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------

export default function XsoCinematicCanvas({ auraWeight = [1, 1], masterAudioUrl, media, onComplete }: XsoCinematicCanvasProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isTouching, setIsTouching] = useState(false);

  // --- Affordance States ---
  const [hasScrolledZ, setHasScrolledZ] = useState(false);
  const [hasRotated3D, setHasRotated3D] = useState(false);

  // --- Physics Mapping ---
  const weightAvg = (auraWeight[0] + Math.max(0, auraWeight[1])) / 2; // 0 to 2
  const springConfig = useMemo(() => ({
    stiffness: Math.max(50, 300 - weightAvg * 125), 
    damping: Math.min(50, 15 + weightAvg * 15),     
    mass: 1 + weightAvg * 0.5                       
  }), [weightAvg]);

  // --- Audio Engine ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceNoteRef = useRef<HTMLAudioElement | null>(null); // For image background audio
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
    
    // Connect master audio through gain
    const source = actx.createMediaElementSource(masterAudio);
    source.connect(gainNode);
    gainNode.connect(actx.destination);

    masterAudio.play().catch(e => console.log("Master audio suspended until interaction:", e));

    const voiceAudio = new Audio();
    voiceAudio.crossOrigin = "anonymous";
    voiceNoteRef.current = voiceAudio;
    
    // Wire up image-based voice note audio
    const voiceSource = actx.createMediaElementSource(voiceAudio);
    voiceSource.connect(actx.destination);

    return () => {
      if (masterAudioRef.current) {
        masterAudioRef.current.pause();
        masterAudioRef.current.src = "";
      }
      if (voiceNoteRef.current) {
        voiceNoteRef.current.pause();
        voiceNoteRef.current.src = "";
      }
      if (actx.state !== 'closed') actx.close().catch(()=>{});
    };
  }, [masterAudioUrl]);

  // Handle Ducking on Memory Change
  useEffect(() => {
    const currentMedia = media[currentIndex];
    
    if (navigator.vibrate) navigator.vibrate(40); // Deep thud on entry

    if (voiceNoteRef.current) {
      voiceNoteRef.current.pause();
      voiceNoteRef.current.currentTime = 0;
      voiceNoteRef.current.onended = null;
    }

    const actx = audioContextRef.current;
    const gainNode = masterGainRef.current;

    const audioUrlToPlay = currentMedia.type === 'audio' ? null : currentMedia.voiceNoteUrl;
    const isVideo = currentMedia.type === 'video';

    if (actx && gainNode) {
      if (actx.state === 'suspended') actx.resume();
      
      if (isVideo || audioUrlToPlay) {
        // Duck down for everything except interactive Ethereal Audio orbs
        gainNode.gain.setTargetAtTime(0.15, actx.currentTime, 0.3);
      } else {
        // Swell back up (Audio orbs wait for manual interaction)
        gainNode.gain.setTargetAtTime(1.0, actx.currentTime, 0.5);
      }
    }

    if (audioUrlToPlay && voiceNoteRef.current) {
      voiceNoteRef.current.src = audioUrlToPlay;
      voiceNoteRef.current.play().catch(e => {
        console.warn('Voice note play blocked by autoplay. Will play on next tap.', e);
      });

      voiceNoteRef.current.onended = () => {
        if (actx && gainNode && !isVideo) {
          gainNode.gain.setTargetAtTime(1.0, actx.currentTime, 1.0);
        }
      };
    }
  }, [currentIndex, media]);


  // --- 3D Interactivity & Interstitial Transforms ---
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  
  const smoothRotX = useSpring(panY, springConfig);
  const smoothRotY = useSpring(panX, springConfig);

  const zoomScale = useMotionValue(1);
  const smoothZoom = useSpring(zoomScale, { stiffness: 200, damping: 25 });

  // Breathing loop (when idle)
  const idleScale = useMotionValue(1);
  const smoothIdleScale = useSpring(idleScale, { stiffness: 50, damping: 20 });
  const idleDriftY = useMotionValue(0);
  const smoothIdleDriftY = useSpring(idleDriftY, { stiffness: 40, damping: 25 });
  
  const totalScale = useTransform(() => smoothIdleScale.get() * smoothZoom.get());
  
  // Image Glare
  const glareOpacity = useTransform(() => {
    const rx = Math.abs(smoothRotX.get() % 360);
    const ry = Math.abs(smoothRotY.get() % 360);
    return (rx > 90 && rx < 270) || (ry > 90 && ry < 270) ? 0.1 : 0.6;
  });
  const glareX = useTransform(smoothRotY, [-180, 180], ['-100%', '200%']);
  const glareY = useTransform(smoothRotX, [-180, 180], ['-100%', '200%']);

  const wobbleAnimRef = useRef<any>(null);

  useEffect(() => {
    if (media[currentIndex].type === 'image' && !hasRotated3D) {
      panX.set(30);
      wobbleAnimRef.current = animate(panX, 0, { type: "spring", stiffness: 40, damping: 12 });
      return () => {
        if (wobbleAnimRef.current) wobbleAnimRef.current.stop();
      };
    }
  }, [currentIndex]); // Intentionally run only on slide change

  useEffect(() => {
    let rAF: number;
    let start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const currentItem = media[currentIndex];

      if (!isTouching && currentItem.type === 'image') {
        idleScale.set(1 + Math.sin(elapsed / 2000) * 0.02);
        idleDriftY.set(Math.sin(elapsed / 1500) * 10);
      } else {
        idleScale.set(isTouching ? 0.98 : 1); 
        idleDriftY.set(0);
      }

      rAF = requestAnimationFrame(tick);
    };
    rAF = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rAF);
  }, [isTouching, idleScale, idleDriftY, currentIndex, media]);

  // --- Global Interaction Handlers ---
  const activePointers = useRef<Map<number, {x: number, y: number}>>(new Map());
  const pointerDist = useRef<number>(0);
  const pointerStartInfo = useRef({ x: 0, y: 0, time: 0 });
  const pointerLastInfo = useRef({ x: 0, y: 0 });

  const executeNavigate = (dir: number) => {
    setHasScrolledZ(true);
    const nextIndex = currentIndex + dir;

    if (nextIndex < 0 || nextIndex >= media.length) {
      if (nextIndex >= media.length) {
        onComplete();
      }
      return;
    }
    
    setDirection(dir);
    setCurrentIndex(nextIndex);
    
    // Reset transforms safely
    panX.set(0);
    panY.set(0);
    zoomScale.set(1);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wobbleAnimRef.current) wobbleAnimRef.current.stop();

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsTouching(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const now = Date.now();
    if (activePointers.current.size === 1) {
      // Toggle Zoom for Image
      if (media[currentIndex].type === 'image' && now - pointerStartInfo.current.time < 300) {
        if (zoomScale.get() > 1) {
          zoomScale.set(1);
          panX.set(0);
          panY.set(0);
        } else {
          zoomScale.set(2);
        }
      }
      pointerStartInfo.current = { x: e.clientX, y: e.clientY, time: now };
      pointerLastInfo.current = { x: e.clientX, y: e.clientY };
    }

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
      masterAudioRef.current?.play().catch(()=>{});
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTouching) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (activePointers.current.size === 2 && media[currentIndex].type === 'image') {
      const pts = Array.from(activePointers.current.values()) as {x: number, y: number}[];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      
      if (pointerDist.current > 0) {
        const delta = dist - pointerDist.current;
        let newZoom = zoomScale.get() + delta * 0.01;
        newZoom = Math.max(0.7, Math.min(newZoom, 4));
        zoomScale.set(newZoom);
      }
      pointerDist.current = dist;
      return; 
    }
    
    pointerDist.current = 0;

    if (activePointers.current.size === 1) {
      const deltaX = e.clientX - pointerLastInfo.current.x;
      const deltaY = e.clientY - pointerLastInfo.current.y;
      
      // ROTATION ONLY APPLIES TO EXACT IMAGE POLAROIDS
      if (media[currentIndex].type === 'image') {
        if (!hasRotated3D && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
          setHasRotated3D(true);
        }
        panX.set(panX.get() + deltaX * 0.4);
        panY.set(panY.get() - deltaY * 0.4);
      }

      pointerLastInfo.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size === 0) {
      setIsTouching(false);
      pointerDist.current = 0;
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      const deltaX = e.clientX - pointerStartInfo.current.x;
      const deltaY = e.clientY - pointerStartInfo.current.y;
      const deltaTime = Date.now() - pointerStartInfo.current.time;
      
      const yVel = (deltaY / (deltaTime || 1)) * 1000;

      if (zoomScale.get() > 1.2 && media[currentIndex].type === 'image') return;

      // Z-Axis Vertical Swipe
      if ((Math.abs(yVel) > 400 || Math.abs(deltaY) > 150) && Math.abs(deltaY) > Math.abs(deltaX)) {
        const dir = deltaY < 0 ? 1 : -1;
        executeNavigate(dir);
      } else {
        if (media[currentIndex].type === 'image' && (Math.abs(deltaX) > 20 || Math.abs(deltaY) > 20)) {
          if (navigator.vibrate) navigator.vibrate(5);
        }
      }
    }
  };

  const lastWheelTime = useRef(0);
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 600) return; // scroll debounce

    if (Math.abs(e.deltaY) > 40) {
      const dir = e.deltaY > 0 ? 1 : -1;
      executeNavigate(dir);
      lastWheelTime.current = now;
    }
  };
  
  // --- Z-Axis Transition Variants ---
  const variants = {
    enter: (dir: number) => ({
      scale: dir > 0 ? 0.5 : 2.5,
      y: dir > 0 ? 100 : -100,
      opacity: 0,
      filter: dir > 0 ? 'brightness(0.2) blur(20px)' : 'brightness(1) blur(20px)',
      zIndex: 0,
    }),
    center: {
      scale: 1,
      y: 0,
      opacity: 1,
      filter: 'brightness(1) blur(0px)',
      zIndex: 10,
    },
    exit: (dir: number) => ({
      scale: dir > 0 ? 2.5 : 0.5,
      y: dir > 0 ? -100 : 100,
      opacity: 0,
      filter: dir > 0 ? 'brightness(1) blur(20px)' : 'brightness(0.2) blur(20px)',
      zIndex: 20,
    })
  };

  return (
    <div 
      className="absolute inset-0 bg-black overflow-hidden font-sans flex items-center justify-center touch-none select-none" 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      style={{ perspective: 1200 }}
    >
      {/* Deep Space Ambiance */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,1) 80%)' }} />

      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            scale: { type: "spring", stiffness: 100, damping: 25 },
            y: { type: "spring", stiffness: 100, damping: 25 },
            opacity: { duration: 0.5, ease: "easeInOut" },
            filter: { duration: 0.5, ease: "easeInOut" }
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none w-full h-full"
        >
          {/* Base physics container that acts as the interaction surface */}
          <motion.div 
            style={{
              x: 0,
              y: smoothIdleDriftY,
              scale: totalScale,
              transformStyle: 'preserve-3d',
            }}
            className="flex items-center justify-center relative pointer-events-none"
          >
            {media[currentIndex].type === 'image' && (
              <PolaroidCard 
                item={media[currentIndex]} 
                smoothRotX={smoothRotX}
                smoothRotY={smoothRotY}
                glareX={glareX}
                glareY={glareY}
                glareOpacity={glareOpacity}
                hasRotated3D={hasRotated3D}
              />
            )}
            
            {media[currentIndex].type === 'video' && (
              <XsoVideoWindow 
                src={media[currentIndex].url}
                title={media[currentIndex].title}
              />
            )}

            {media[currentIndex].type === 'audio' && (
              <XsoAudioOrb 
                src={media[currentIndex].url}
                title={media[currentIndex].title}
                duration={media[currentIndex].duration}
                onPlayStart={() => {
                  if (masterGainRef.current && audioContextRef.current) {
                    masterGainRef.current.gain.setTargetAtTime(0.15, audioContextRef.current.currentTime, 0.3);
                  }
                }}
                onPlayStop={() => {
                  if (masterGainRef.current && audioContextRef.current) {
                    masterGainRef.current.gain.setTargetAtTime(1.0, audioContextRef.current.currentTime, 0.5);
                  }
                }}
              />
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* PULL FORWARD Hint */}
      <AnimatePresence>
        {!hasScrolledZ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -5, 0] }}
            transition={{ 
              opacity: { duration: 1 }, 
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } 
            }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20"
          >
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-white/40">Pull Forward</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicators */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none opacity-40 z-20">
        <div className="flex gap-2.5">
          {media.map((_, i) => (
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
