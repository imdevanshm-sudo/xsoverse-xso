import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface XsoAudioOrbProps {
  src: string;
  title?: string;
  duration?: string;
  onPlayStart?: () => void;
  onPlayStop?: () => void;
}

export function XsoAudioOrb({ src, title, duration, onPlayStart, onPlayStop }: XsoAudioOrbProps) {
  const [isHeld, setIsHeld] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration || "0:00");

  const audioRef = useRef<HTMLAudioElement>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isHeldRef = useRef(false);
  const rAFRef = useRef<number>(0);
  const lastVibeRef = useRef(0);

  const bassMotion = useMotionValue(0);
  const midMotion = useMotionValue(0);
  const highMotion = useMotionValue(0);

  const smoothBass = useSpring(bassMotion, { stiffness: 300, damping: 30 });
  const smoothMid = useSpring(midMotion, { stiffness: 350, damping: 35 });
  const smoothHigh = useSpring(highMotion, { stiffness: 400, damping: 40 });

  const auraScale = useTransform(smoothBass, [0, 255], [0.8, 1.8]);
  const auraOpacity = useTransform(smoothBass, [0, 255], [0.0, 1.0]);
  const orbGlow = useTransform(smoothHigh, [0, 255], [
    'inset 0 0 0px rgba(255,255,255,0)',
    'inset 0 0 120px rgba(200,220,255,0.9)',
  ]);
  const anchorScale = useTransform(smoothMid, [0, 255], [1, 1.5]);
  const anchorOpacity = useTransform(smoothMid, [0, 255], [0.3, 0.9]);

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
    if (!analyserRef.current || !isHeldRef.current) return;
    const analyser = analyserRef.current;
    if (actxRef.current?.state === 'suspended') {
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

    const now = performance.now();
    // Haptic hit on cadence (combination of mid and bass)
    if ((bassAvg > 130 || midAvg > 120) && now - lastVibeRef.current > 70) {
      if (navigator.vibrate) navigator.vibrate(10);
      lastVibeRef.current = now;
    }

    rAFRef.current = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    isHeldRef.current = true;
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = requestAnimationFrame(tick);
  };

  const stopLoop = () => {
    isHeldRef.current = false;
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    bassMotion.set(0);
    midMotion.set(0);
    highMotion.set(0);
  };

  const handleDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent Canvas Z-scrolling
    setIsHeld(true);
    initAudio();
    onPlayStart?.();
    audioRef.current?.play().catch(err => console.warn('Audio play failed:', err));
    startLoop();
  };

  const handleUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!isHeldRef.current) return;
    setIsHeld(false);
    onPlayStop?.();
    audioRef.current?.pause();
    stopLoop();
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
      handleUp({ stopPropagation: () => {} } as any);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      if (actxRef.current && actxRef.current.state !== 'closed') {
        actxRef.current.close().catch(()=>{});
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[60vh] flex flex-col items-center justify-center touch-none pointer-events-auto">
      <audio ref={audioRef} src={src} crossOrigin="anonymous" preload="auto" />
      
      {/* Liquid Aura Container */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         <motion.div
             className="absolute inset-0 flex items-center justify-center mix-blend-screen"
             style={{ scale: auraScale, opacity: auraOpacity }}
             animate={{ rotate: isHeld ? 360 : 0 }}
             transition={{ duration: 15, ease: "linear", repeat: Infinity }}
         >
            <div className="absolute w-[60vw] md:w-[30vw] aspect-square bg-cyan-400/60 rounded-full blur-[80px] md:blur-[100px] -translate-x-12 translate-y-12" />
            <div className="absolute w-[50vw] md:w-[25vw] aspect-square bg-fuchsia-400/60 rounded-full blur-[80px] md:blur-[100px] translate-x-12 -translate-y-8" />
            <div className="absolute w-[70vw] md:w-[35vw] aspect-square bg-violet-500/60 rounded-full blur-[100px] md:blur-[120px]" />
         </motion.div>
      </div>

      {/* The Glass Orb */}
      <motion.div
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
        onPointerCancel={handleUp}
        className="w-48 h-48 md:w-64 md:h-64 rounded-full border border-white/10 bg-white/5 backdrop-blur-2xl flex items-center justify-center relative cursor-grab active:cursor-grabbing overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 pointer-events-auto"
        animate={{ scale: isHeld ? 0.95 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full mix-blend-overlay pointer-events-none"
          style={{ boxShadow: orbGlow }}
        />
        {/* Core visual anchor */}
        <motion.div 
          className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-white/20 blur-xl pointer-events-none"
          style={{ scale: anchorScale, opacity: anchorOpacity }}
        />
      </motion.div>

      {/* Typography Overlay */}
      <div className="mt-12 flex flex-col items-center pointer-events-none z-20 w-full text-center">
        <h3 className="text-sm md:text-base tracking-widest mb-2 font-sans font-light text-white/70 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] uppercase">
           {title || "Voice Note"}
        </h3>
        <p className="text-white/40 text-xs font-mono tracking-[0.2em] mb-4">
           {timeLeft}
        </p>
        <div className="h-4 relative w-full flex justify-center">
            <AnimatePresence>
               {!isHeld && (
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
