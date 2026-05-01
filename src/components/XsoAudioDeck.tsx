import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useAnimation } from 'framer-motion';

export interface XsoAudioDeckProps {
  src: string;
  title?: string;
  duration?: string;
  onPlayStart?: () => void;
  onPlayStop?: () => void;
}

export function XsoAudioDeck({ src, title, duration, onPlayStart, onPlayStop }: XsoAudioDeckProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration || "0:00");
  const [isDragging, setIsDragging] = useState(false);
  const [hasStartedDragging, setHasStartedDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rAFRef = useRef<number>(0);
  const deckRef = useRef<HTMLDivElement>(null);
  
  const artifactControls = useAnimation();

  const bassMotion = useMotionValue(0);
  const midMotion = useMotionValue(0);
  const highMotion = useMotionValue(0);

  const smoothBass = useSpring(bassMotion, { stiffness: 300, damping: 30 });
  const smoothMid = useSpring(midMotion, { stiffness: 350, damping: 35 });
  const smoothHigh = useSpring(highMotion, { stiffness: 400, damping: 40 });

  const auraScale = useTransform(smoothBass, [0, 255], [0.8, 2.5]);
  const auraOpacity = useTransform(smoothBass, [0, 255], [0.0, 1.0]);
  const orbGlow = useTransform(smoothHigh, [0, 255], [
    'inset 0 0 0px rgba(255,255,255,0)',
    'inset 0 0 120px rgba(200,220,255,0.9)',
  ]);
  const anchorScale = useTransform(smoothMid, [0, 255], [1, 1.5]);
  const anchorOpacity = useTransform(smoothMid, [0, 255], [0.3, 0.9]);

  // Audio Init
  const initAudio = () => {
    if (!audioRef.current) return;
    if (!actxRef.current) {
      const Actx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Actx) return;
      const actx = new Actx();
      actxRef.current = actx;
      
      const analyser = actx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const source = actx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(actx.destination);
    }
    if (actxRef.current.state === 'suspended') {
      actxRef.current.resume();
    }
  };

  const tick = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    
    if (audioRef.current?.paused) {
         bassMotion.set(0);
         midMotion.set(0);
         highMotion.set(0);
         rAFRef.current = requestAnimationFrame(tick);
         return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    let bassSum = 0;
    for (let i = 0; i < 15; i++) bassSum += dataArray[i];
    const bassAvg = bassSum / 15;
    bassMotion.set(bassAvg);

    let midSum = 0;
    for (let i = 15; i < 60; i++) midSum += dataArray[i];
    const midAvg = midSum / 45;
    midMotion.set(midAvg);

    let highSum = 0;
    for (let i = 150; i < 200; i++) highSum += dataArray[i];
    const highAvg = highSum / 50;
    highMotion.set(highAvg);

    // Subtle spinning haptic clicks when playing
    if (bassAvg > 180 && Math.random() > 0.8) {
      if (navigator.vibrate) navigator.vibrate([10]);
    }

    rAFRef.current = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    bassMotion.set(0);
    midMotion.set(0);
    highMotion.set(0);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const onTimeUpdate = () => {
      if (isNaN(audio.duration) || audio.duration <= 0) return;
      const remaining = Math.max(0, Math.ceil(audio.duration - audio.currentTime));
      const m = Math.floor(remaining / 60);
      const s = Math.floor(remaining % 60).toString().padStart(2, '0');
      setTimeLeft(`${m}:${s}`);
    };

    const onEnded = () => {
       // Stop audio but keep artifact loaded for now, or eject it? 
       // We'll keep it loaded and paused.
       setIsPlaying(false);
       onPlayStop?.();
       stopLoop();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [onPlayStop]);

  useEffect(() => {
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      if (actxRef.current && actxRef.current.state !== 'closed') {
        actxRef.current.close().catch(()=>{});
      }
    };
  }, []);


  const handleDragStart = () => {
      setIsDragging(true);
      if (!isLoaded) {
        setHasStartedDragging(true);
      }
  };

  const handleDrag = (event: any, info: any) => {
      // Removed vibration during drag for smoother performance
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);

    if (isLoaded) {
       // Check if pulled down significantly to eject
       if (info.offset.y > 20 || info.velocity.y > 50) {
           handleEject();
       } else {
           // Snap back to slot
           artifactControls.start({ y: 60, transition: { type: 'spring', stiffness: 300, damping: 20 }});
       }
       return;
    }

    if (deckRef.current) {
        const deckRect = deckRef.current.getBoundingClientRect();
        const artifactY = info.point.y;

        // Extremely forgiving hit area and swipe check
        const isSwipeUp = info.offset.y < -5 || info.velocity.y < -20;
        const isInside = isSwipeUp || artifactY < deckRect.bottom + 200;

        if (isInside) {
           handleLoad();
        } else {
           artifactControls.start({
               x: 0,
               y: 240,
               scale: 1,
               transition: { type: 'spring', stiffness: 500, damping: 30 }
           });
        }
    } else {
        artifactControls.start({
            x: 0,
            y: 240,
            scale: 1,
            transition: { type: 'spring', stiffness: 500, damping: 30 }
        });
    }
  };

  const handleDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isLoaded) return;
    setIsPlaying(true);
    if (navigator.vibrate) navigator.vibrate([15, 30]);
    initAudio();
    onPlayStart?.();
    audioRef.current?.play().catch(err => console.warn('Audio play failed:', err));
    startLoop();
  };

  const handleUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isLoaded || !isPlaying) return;
    setIsPlaying(false);
    onPlayStop?.();
    audioRef.current?.pause();
    stopLoop();
  };

  const handleEject = () => {
      if (navigator.vibrate) navigator.vibrate([20, 10, 30]); // Eject clunk
      setIsLoaded(false);
      setIsPlaying(false);
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      onPlayStop?.();
      stopLoop();

      // Animate artifact down
      artifactControls.start({
          x: 0,
          y: 240, 
          scale: 1,
          transition: { type: 'tween', duration: 0.3, ease: 'backOut' }
      });
  };

  const handleLoad = () => {
      if (navigator.vibrate) navigator.vibrate([40, 20, 50]); // Satisfying mechanical clunk
      setIsLoaded(true);
      
      // Animate artifact into the center slot
      artifactControls.start({
          x: 0,
          y: 60, // Slot down
          scale: 0.9,
          transition: { type: 'tween', duration: 0.25, ease: 'backOut' }
      });

      initAudio();
  };


  return (
    <div className="relative w-full h-[80vh] flex flex-col items-center justify-center pointer-events-auto">
      <audio ref={audioRef} src={src} crossOrigin="anonymous" preload="auto" />
      
      {/* THE ORB PLAYER AREA (Only visible when loaded) */}
      <AnimatePresence>
        {isLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-[5%] w-full flex items-center justify-center pointer-events-none z-40"
          >
            {/* Liquid Aura Container */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <motion.div
                   className="absolute flex items-center justify-center mix-blend-screen"
                   style={{ scale: auraScale, opacity: auraOpacity }}
                   animate={{ rotate: isPlaying ? 360 : 0 }}
                   transition={{ duration: 15, ease: "linear", repeat: Infinity }}
               >
                  <div className="absolute w-[60vw] md:w-[30vw] aspect-square bg-cyan-400/60 rounded-full blur-[80px] md:blur-[100px] -translate-x-12 translate-y-12" />
                  <div className="absolute w-[50vw] md:w-[25vw] aspect-square bg-fuchsia-400/60 rounded-full blur-[80px] md:blur-[100px] translate-x-12 -translate-y-8" />
                  <div className="absolute w-[70vw] md:w-[35vw] aspect-square bg-violet-500/60 rounded-full blur-[100px] md:blur-[120px]" />
               </motion.div>
            </div>

            {/* The Glass Orb BUTTON */}
            <motion.div
              onPointerDown={handleDown}
              onPointerUp={handleUp}
              onPointerLeave={handleUp}
              onPointerCancel={handleUp}
              onPointerMove={(e) => e.stopPropagation()}
              className="w-48 h-48 md:w-64 md:h-64 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-center relative cursor-grab active:cursor-grabbing overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 pointer-events-auto"
              animate={{ scale: isPlaying ? 0.95 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <motion.div
                className="absolute inset-0 rounded-full mix-blend-overlay pointer-events-none"
                style={{ boxShadow: orbGlow }}
              />
              <motion.div 
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/20 blur-xl pointer-events-none"
                style={{ scale: anchorScale, opacity: anchorOpacity }}
              />
              {!isPlaying && (
                <div className="absolute text-white/60 text-[10px] tracking-widest font-mono select-none pointer-events-none z-10 transition-opacity duration-300">
                    {/* Empty or keep something if needed, but we rely on Typography overlay now */}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full max-w-sm flex flex-col items-center mt-32 z-10">

          {/* THE DECK */}
          <div className="absolute top-[20%] w-[260px] h-[160px] flex items-center justify-center rounded-2xl bg-black/40 border border-white/5 shadow-[inset_0_10px_30px_rgba(0,0,0,0.8),0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl pointer-events-none" ref={deckRef}>
              {/* The Pearl */}
              <motion.div 
                 className="absolute w-16 h-16 rounded-full bg-white blur-[2px] mix-blend-screen"
                 style={{
                     boxShadow: "0 0 60px rgba(255,255,255,0.8), inset 0 0 20px rgba(255,255,255,1)",
                     scale: isLoaded ? auraScale : 0.8,
                     opacity: isLoaded ? 1 : 0.3
                 }}
              />
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-4 rounded-full bg-black/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]" />
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent)] rounded-2xl" />
          </div>

          {/* THE ARTIFACT (Cassette) */}
          <motion.div
            drag="y"
            onPointerDown={(e) => { e.stopPropagation(); }}
            dragSnapToOrigin={false}
            dragMomentum={false}
            dragConstraints={{ top: 60, bottom: 240 }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            animate={artifactControls}
            initial={{ y: 240, x: 0 }}
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
            className={`w-[220px] h-[140px] rounded-xl flex items-center justify-between px-6 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20 backdrop-blur-md overflow-hidden relative ${!isLoaded ? 'cursor-grab active:cursor-grabbing' : 'cursor-grab active:cursor-grabbing'}`}
            style={{ 
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(200,200,200,0.05) 50%, rgba(50,50,50,0.2) 100%)',
                zIndex: 50,
                willChange: 'transform'
            }}
          >
             {/* Cassette Label */}
             <div className="absolute top-2 inset-x-12 h-6 bg-[#fdfcf0]/90 rounded-sm flex items-center justify-center shadow-sm">
                 <p className="text-[10px] font-mono text-black/80 tracking-widest uppercase truncate px-2">{title || "Voice Note"}</p>
             </div>

             {/* Left Reel */}
             <div className="w-16 h-16 rounded-full border-4 border-white/10 bg-black/40 flex items-center justify-center relative shadow-inner">
                <motion.div 
                   animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   className="w-full h-full rounded-full border-2 border-dashed border-white/20 absolute"
                />
                <div className="w-4 h-4 bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(255,100,100,0.8)]" />
             </div>

             {/* Right Reel */}
             <div className="w-16 h-16 rounded-full border-4 border-white/10 bg-black/40 flex items-center justify-center relative shadow-inner">
                <motion.div 
                   animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   className="w-full h-full rounded-full border-2 border-dashed border-white/20 absolute"
                />
                <div className="w-4 h-4 bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8),inset_0_0_5px_rgba(100,100,255,0.8)]" />
             </div>
             
             {/* Glossy Reflective Glare */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          </motion.div>
          
      </div>

      {/* Typography Overlay */}
      <div className="absolute top-[80%] flex flex-col items-center pointer-events-none z-30 w-full text-center">
        <h3 className="text-sm md:text-base tracking-widest mb-2 font-sans font-light text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] uppercase">
           {isLoaded ? (title || "Voice Note") : ""}
        </h3>
        <p className="text-white/40 text-xs font-mono tracking-[0.2em] mb-4">
           {isLoaded ? timeLeft : ""}
        </p>
        <div className="h-4 relative w-full flex justify-center">
            <AnimatePresence>
               {!hasStartedDragging && !isLoaded && (
                  <motion.div 
                     key="drag-load-hint"
                     className="absolute"
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     exit={{ opacity: 0, transition: { duration: 0.5 }}}>
                     <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/40 drop-shadow-md">Drag To Load</p>
                  </motion.div>
               )}
               {isLoaded && !isPlaying && (
                  <motion.div 
                     key="hold-listen-hint"
                     className="absolute"
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     exit={{ opacity: 0, transition: { duration: 0.5 }}}>
                     <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/50 drop-shadow-md">Hold to Listen</p>
                  </motion.div>
               )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
