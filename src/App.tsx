import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import XsoReceiverSanctum from './components/XsoReceiverSanctum';
import Xso3DPearl from './components/Xso3DPearl';

const BREATH_DURATION = 6;
const INITIAL_HOLD_DURATION = 1800;
const RITUAL_HOLD_DURATION = 4000;

type AppState = 'IDLE' | 'FOCUSED_INITIAL' | 'VIDEO' | 'MEMORY_CANVAS' | 'IDLE_DARK' | 'UNSEALED_EMBER' | 'REEMERGENCE' | 'RITUAL_HOLD' | 'FRACTURE' 
  | 'VOICE_PROMPT' | 'RECORDING_VOICE' | 'VOICE_READY_TO_RELEASE' | 'RELEASED_ORBIT';

const BackgroundParticles = React.memo(({ isDark }: { isDark: boolean }) => {
  if (isDark) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 25 }).map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 2 + 0.5;
        const animDuration = Math.random() * 15 + 25;
        const yOffset = Math.random() * 10 + 5;
        return (
          <motion.div
            key={`bg-${i}`}
            className="absolute rounded-full bg-[#e0e5ff]"
            style={{ 
              top: `${y}%`, left: `${x}%`, width: size, height: size,
              willChange: 'transform, opacity'
            }}
            initial={{ opacity: Math.random() * 0.1 }}
            animate={{
              y: [`0%`, `-${yOffset}%`],
              opacity: [0, Math.random() * 0.15 + 0.05, 0],
            }}
            transition={{
              duration: animDuration,
              repeat: Infinity,
              ease: 'linear',
              delay: Math.random() * 10,
            }}
          />
        );
      })}
    </div>
  );
});

const NestedCoreFields = React.memo(({ isHolding, isRitual }: { isHolding: boolean, isRitual: boolean }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-screen">
      {[...Array(4)].map((_, i) => {
        const isAmber = i % 2 === 0;
        // Shift colors slightly during ritual
        const rgb = isRitual ? (isAmber ? '255, 100, 150' : '220, 50, 180') : (isAmber ? '255, 140, 40' : '180, 80, 255');
        return (
          <motion.div
            key={i}
            className="absolute rounded-[40%_60%_70%_30%/40%_50%_60%_50%]"
            style={{
              width: `${45 + i * 14}%`,
              height: `${45 + i * 14}%`,
              border: `1px solid rgba(${rgb}, 0.35)`,
              boxShadow: `inset 0 0 ${12 + i * 5}px rgba(${rgb}, 0.3), 0 0 ${5 + i * 2}px rgba(${rgb}, 0.4)`,
              willChange: 'transform, opacity'
            }}
            animate={{
              rotate: i % 2 === 0 ? [0, 360] : [360, 0],
              scale: isHolding ? (isRitual ? 2.5 : 4) : [1, 1.05 + i * 0.01, 1],
              opacity: isHolding ? (isRitual ? 1 : 0) : [0.6, 0.9, 0.6],
            }}
            transition={{
              rotate: {
                duration: 35 + i * 6,
                repeat: Infinity,
                ease: 'linear',
              },
              scale: isHolding
                ? { duration: isRitual ? RITUAL_HOLD_DURATION / 1000 : 1.5, ease: 'easeIn' }
                : { duration: BREATH_DURATION, repeat: Infinity, ease: 'easeInOut' },
              opacity: isHolding
                ? { duration: isRitual ? RITUAL_HOLD_DURATION / 1000 : 0.5, ease: 'easeOut' }
                : { duration: BREATH_DURATION, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        );
      })}
    </div>
  );
});

// A component that generates the polygonal crystalline fracture structure
const FracturedCrystal = React.memo(() => {
  const facets = [
    { clipPath: 'polygon(50% 0%, 100% 25%, 50% 50%, 0% 25%)', color: 'rgba(100, 200, 255, 0.8)' },
    { clipPath: 'polygon(100% 25%, 100% 75%, 50% 100%, 50% 50%)', color: 'rgba(50, 150, 220, 0.9)' },
    { clipPath: 'polygon(0% 25%, 50% 50%, 50% 100%, 0% 75%)', color: 'rgba(80, 220, 200, 0.7)' },
    { clipPath: 'polygon(20% 0%, 80% 0%, 50% 30%)', color: 'rgba(255, 255, 255, 0.9)' },
    { clipPath: 'polygon(50% 30%, 80% 0%, 100% 40%, 50% 60%)', color: 'rgba(120, 80, 255, 0.6)' },
    { clipPath: 'polygon(50% 30%, 50% 60%, 0% 40%, 20% 0%)', color: 'rgba(40, 100, 200, 0.8)' },
    { clipPath: 'polygon(50% 60%, 100% 40%, 80% 100%, 50% 100%)', color: 'rgba(60, 200, 150, 0.7)' },
    { clipPath: 'polygon(0% 40%, 50% 60%, 50% 100%, 20% 100%)', color: 'rgba(30, 80, 150, 0.9)' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 z-20 pointer-events-none"
      initial={{ scale: 1.2, opacity: 0, rotate: -15 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.1, ease: 'easeOut' }} // Instant snap
    >
      {/* Outer Glow */}
      <div className="absolute inset-x-[-20%] inset-y-[-20%] rounded-full bg-[radial-gradient(circle_at_center,rgba(100,200,255,0.4),transparent_60%)] mix-blend-screen blur-xl" />
      
      {/* Fractal geometry */}
      {facets.map((facet, i) => (
        <motion.div
          key={`wrapper-${i}`}
          className="absolute inset-0"
          initial={{ x: 0, y: 0 }}
          animate={{ 
            x: [0, (Math.random() - 0.5) * 6, 0], 
            y: [0, (Math.random() - 0.5) * 6, 0] 
          }}
          transition={{ duration: Math.random() * 4 + 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              clipPath: facet.clipPath,
              background: `linear-gradient(${135 + i * 30}deg, ${facet.color}, rgba(10, 20, 50, 0.8))`,
              boxShadow: 'inset 0 0 10px rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.4)'
            }}
            initial={{ scale: 1.1, x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 50 }}
            animate={{ scale: 1, x: 0, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 20,
              delay: i * 0.02
            }}
          />
        </motion.div>
      ))}
      
      {/* Intense bright core lines with pulsing animation */}
      <motion.div 
        className="absolute inset-0 mix-blend-overlay"
        style={{
          background: 'radial-gradient(circle_at_50%_50%, rgba(255,255,255,1) 0%, transparent 25%)'
        }}
        initial={{ opacity: 0.6, scale: 0.9 }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
});

export default function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [shareEcho, setShareEcho] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const stars = useMemo(() => Array.from({ length: 60 }).map((_, i) => (
    <motion.div 
      key={`star-${i}`} 
      className="absolute rounded-full bg-white mix-blend-screen"
      style={{ 
        top: `${Math.random() * 100}%`, 
        left: `${Math.random() * 100}%`, 
        width: `${Math.random() * 3 + 1}px`, 
        height: `${Math.random() * 3 + 1}px`,
        filter: `blur(${Math.random() * 1.5 + 0.5}px)`,
      }}
      initial={{ 
        opacity: Math.random() * 0.5 + 0.1,
        y: 0
      }}
      animate={{ 
        opacity: [null, Math.random() * 0.8 + 0.2, Math.random() * 0.5 + 0.1],
        y: -Math.random() * 40 - 20 // move up very slowly by 20 to 60 px
      }}
      transition={{
        duration: Math.random() * 10 + 10,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )), []);
  
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ritualHapticIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pointerStateRef = useRef({ startY: 0, isDragging: false });
  const spaceVideoRef = useRef<HTMLVideoElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Background breathing haptics for IDLE
  useEffect(() => {
    if (appState !== 'IDLE' || !navigator.vibrate) return;

    const intervalId = setInterval(() => {
      navigator.vibrate([10, 80, 20, 80, 30, 80, 40, 50, 60]);
    }, BREATH_DURATION * 1000);

    return () => clearInterval(intervalId);
  }, [appState]);

  // Handle the Reemergence flow
  useEffect(() => {
    if (appState === 'IDLE_DARK') {
      const t = setTimeout(() => {
        setAppState('REEMERGENCE');
        if (navigator.vibrate) navigator.vibrate(10); // Soft, imperceptible tick
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [appState]);

  // Trigger Space Video Play on Release
  useEffect(() => {
    if (appState === 'RELEASED_ORBIT' && spaceVideoRef.current) {
      spaceVideoRef.current.currentTime = 0;
      // Start playing the video just before the black overlay crossfades
      const t = setTimeout(() => {
        if (spaceVideoRef.current) {
          spaceVideoRef.current.play().catch((e) => console.log('Video play interrupted:', e));
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [appState]);

  // Handle Ritual Haptics
  useEffect(() => {
    if (appState === 'RITUAL_HOLD' && navigator.vibrate) {
      let intensity = 10;
      let delay = 600; // start slow
      
      const triggerHeartbeat = () => {
        navigator.vibrate([intensity, 30, intensity + 10]);
        intensity = Math.min(80, intensity + 8); // ramp up
        delay = Math.max(150, delay - 40); // speed up
        ritualHapticIntervalRef.current = setTimeout(triggerHeartbeat, delay);
      };
      
      triggerHeartbeat();
      
      return () => {
        if (ritualHapticIntervalRef.current) clearTimeout(ritualHapticIntervalRef.current);
      }
    }
  }, [appState]);

  // Audio recording volume analysis
  useEffect(() => {
    if (appState === 'RECORDING_VOICE') {
      let isComponentMounted = true;
      
      const startAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          if (!isComponentMounted) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
          microphoneRef.current.connect(analyserRef.current);
          
          analyserRef.current.fftSize = 256;
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const updateAudioLevel = () => {
            if (!analyserRef.current || !isComponentMounted) return;
            
            analyserRef.current.getByteFrequencyData(dataArray);
            
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            
            const average = sum / bufferLength;
            setAudioLevel(average);
            
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          
          updateAudioLevel();
        } catch (err) {
          console.error("Microphone access denied or not available", err);
        }
      };
      
      startAudio();

      if (navigator.vibrate) {
        const intervalId = setInterval(() => {
          navigator.vibrate([15, 20, 15, 40]);
        }, 400);
        return () => {
          isComponentMounted = false;
          clearInterval(intervalId);
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
          if (microphoneRef.current?.mediaStream) {
            microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
          }
        };
      } else {
        return () => {
          isComponentMounted = false;
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
          }
          if (microphoneRef.current?.mediaStream) {
            microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
          }
        };
      }
    } else {
      setAudioLevel(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (microphoneRef.current?.mediaStream) {
        microphoneRef.current.mediaStream.getTracks().forEach(track => track.stop());
      }
    }
  }, [appState]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (appState === 'VIDEO' || appState === 'MEMORY_CANVAS' || appState === 'IDLE_DARK' || appState === 'UNSEALED_EMBER' || appState === 'FRACTURE' || appState === 'RELEASED_ORBIT') return;

    pointerStateRef.current = { startY: e.clientY, isDragging: false };
  };

  const handlePearlPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    pointerStateRef.current = { startY: e.clientY, isDragging: false };

    if (appState === 'IDLE') {
      setAppState('FOCUSED_INITIAL');
      if (navigator.vibrate) navigator.vibrate([30, 50, 40]);

      holdTimeoutRef.current = setTimeout(() => {
        setAppState('VIDEO');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]); 
      }, INITIAL_HOLD_DURATION);
    } 
    else if (appState === 'REEMERGENCE') {
      setAppState('RITUAL_HOLD');
      if (navigator.vibrate) navigator.vibrate(20);
      
      holdTimeoutRef.current = setTimeout(() => {
        setAppState('FRACTURE');
        // Dramatic crystalline shatter haptic
        if (navigator.vibrate) navigator.vibrate([200, 50, 100, 30, 200, 30, 100]); 
      }, RITUAL_HOLD_DURATION);
    }
    else if (appState === 'VOICE_PROMPT' || appState === 'VOICE_READY_TO_RELEASE') {
      // User acts as push-to-talk
      setAppState('RECORDING_VOICE');
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if ((appState === 'REEMERGENCE' || appState === 'RITUAL_HOLD') && pointerStateRef.current.startY > 0) {
      const deltaY = pointerStateRef.current.startY - e.clientY;
      if (deltaY > 60) {
        // Swipe UP detected -> Release Branch
        setAppState('VOICE_PROMPT');
        pointerStateRef.current = { startY: 0, isDragging: false };
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        if (navigator.vibrate) navigator.vibrate([10, 40, 20, 40]); // cooling haptic
      }
    } else if ((appState === 'VOICE_PROMPT' || appState === 'RECORDING_VOICE' || appState === 'VOICE_READY_TO_RELEASE') && pointerStateRef.current.startY > 0) {
      const deltaY = e.clientY - pointerStateRef.current.startY;
      if (deltaY > 60) {
        // Swipe DOWN detected -> Revert to Reemergence
        setAppState('REEMERGENCE');
        pointerStateRef.current = { startY: 0, isDragging: false };
        if (navigator.vibrate) navigator.vibrate([40, 20, 10]); // revert haptic
      }
    }
  };

  const handlePointerUp = (e?: React.SyntheticEvent) => {
    pointerStateRef.current = { startY: 0, isDragging: false };

    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (appState === 'FOCUSED_INITIAL') {
      setAppState('IDLE');
      if (navigator.vibrate) navigator.vibrate(20);
    } else if (appState === 'RITUAL_HOLD') {
      // Penalty: Instantly dims and resets
      setAppState('REEMERGENCE');
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
    } else if (appState === 'RECORDING_VOICE') {
      setAppState('VOICE_READY_TO_RELEASE');
      if (navigator.vibrate) navigator.vibrate([20, 20]);
    }
  };

  const isDarkPhase = appState === 'MEMORY_CANVAS' || appState === 'IDLE_DARK' || appState === 'UNSEALED_EMBER' || appState === 'REEMERGENCE' || appState === 'RITUAL_HOLD' || appState === 'FRACTURE' || appState === 'VOICE_PROMPT' || appState === 'RECORDING_VOICE' || appState === 'VOICE_READY_TO_RELEASE' || appState === 'RELEASED_ORBIT';
  const showPearl = appState === 'IDLE' || appState === 'FOCUSED_INITIAL' || appState === 'REEMERGENCE' || appState === 'RITUAL_HOLD' || appState === 'VOICE_PROMPT' || appState === 'RECORDING_VOICE' || appState === 'VOICE_READY_TO_RELEASE' || appState === 'RELEASED_ORBIT';
  const isHoldingPearl = appState === 'FOCUSED_INITIAL' || appState === 'RITUAL_HOLD';
  const isCoolingPhase = appState === 'VOICE_PROMPT' || appState === 'RECORDING_VOICE' || appState === 'VOICE_READY_TO_RELEASE' || appState === 'RELEASED_ORBIT';

  return (
    <div
      className="relative flex flex-col items-center justify-center w-[100dvw] h-[100dvh] bg-black overflow-hidden select-none touch-none font-sans"
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Layer 0: Deep Space Video (Plays Once) */}
      <video 
        ref={spaceVideoRef}
        src="/Apr_22_0955_pm_16s_202604222220_5yzqm.mp4" 
        muted 
        playsInline 
        onEnded={() => setAppState('UNSEALED_EMBER')}
        className="absolute inset-0 w-full h-full object-cover z-0 scale-[1.25] sm:scale-150 md:scale-[1.2]"
      />
      {/* Layer 1: The Black Overlay */}
      <motion.div 
        className="absolute inset-0 bg-[#030304] z-0 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: appState === 'RELEASED_ORBIT' ? 0 : 1 }}
        transition={{ 
          duration: appState === 'RELEASED_ORBIT' ? 2.5 : 0.4, 
          delay: appState === 'RELEASED_ORBIT' ? 1.5 : 0, 
          ease: 'easeInOut' 
        }}
      />
      
      {/* Starry Night Overlay during Voice steps */}
      <AnimatePresence>
        {isCoolingPhase && appState !== 'RELEASED_ORBIT' && (
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            {stars}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Overlay */}
      {appState === 'VIDEO' && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center cursor-default pointer-events-auto">
          <video 
            src="/video.mp4#t=0.5" 
            autoPlay 
            playsInline 
            preload="auto"
            className="w-full h-full object-cover"
            onLoadedMetadata={(e) => {
              (e.target as HTMLVideoElement).currentTime = 0.5;
            }}
            onEnded={() => setAppState('MEMORY_CANVAS')}
          />
        </div>
      )}

      {/* Memory Cinematic Canvas Overlay */}
      {appState === 'MEMORY_CANVAS' && (
        <div className="absolute inset-0 z-50 pointer-events-auto">
          <XsoReceiverSanctum 
            auraWeight={[1, 1]}
            masterAudioUrl="https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"
            media={[
              { id: '1', type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&fit=crop', title: 'Summer in Kyoto - 2024', voiceNoteUrl: 'https://actions.google.com/sounds/v1/human_voices/human_voice_clip.ogg' },
              { id: '3', type: 'video', url: '/video.mp4', title: 'Night Ride' },
              { id: '2', type: 'audio', url: '/Easy on Me Now.mp3', title: 'Voice Note from Taylor', duration: '0:42' },
              { id: '4', type: 'image', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&fit=crop', title: 'The drive back home...', voiceNoteUrl: 'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg' }
            ]}
            onComplete={() => setAppState('IDLE_DARK')}
          />
        </div>
      )}

      {/* The Unsealed Ember UI */}
      <AnimatePresence>
        {appState === 'UNSEALED_EMBER' && (
          <motion.div
            key="unsealed-ember"
            className="absolute inset-0 z-40 flex flex-col items-center justify-center min-h-screen overflow-hidden font-serif select-none pointer-events-auto bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          >
            <div className="flex flex-col items-center justify-center space-y-20 md:space-y-28">
              
              {/* Top Typography */}
              <p className="text-[#FDFBF7] opacity-85 text-[13px] md:text-base tracking-[0.2em] md:tracking-[0.25em] font-light">
                Crafted by Alex
              </p>

              {/* The Ember */}
              <div className="relative flex items-center justify-center">
                {/* Core of the ember */}
                <div className="w-1 h-1 rounded-full bg-[#FFF2DA] relative z-10 shadow-[0_0_12px_rgba(255,130,0,1)]"></div>
                {/* Intensely concentrated glow layers - Warm Amber/Orange spectrum */}
                <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400/80 blur-[2px]"></div>
                <div className="absolute w-6 h-6 rounded-full bg-orange-500/50 blur-[4px]"></div>
                <div className="absolute w-12 h-12 rounded-full bg-orange-600/30 blur-[8px]"></div>
                <div className="absolute w-24 h-24 rounded-full bg-orange-700/15 blur-[16px]"></div>
                <div className="absolute w-36 h-36 rounded-full bg-[#ff3300]/5 blur-[24px]"></div>
              </div>

              {/* Bottom Typography */}
              <div className="flex flex-col items-center text-center space-y-8 md:space-y-12 text-[#FDFBF7] opacity-85 text-[13px] md:text-base tracking-[0.2em] md:tracking-[0.25em] font-light">
                <p>
                  Unsealed by Taylor
                </p>
                <p>
                  April 22, 2026
                </p>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Branch B: The Release UI Elements */}
      <AnimatePresence>
        {appState === 'VOICE_PROMPT' && (
          <motion.div
            key="cooling-phase"
            className="absolute top-20 left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <p className="text-white/30 text-[10px] tracking-widest uppercase mb-4 text-center pb-2">
              (SWIPE DOWN TO RETRACT)
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {appState === 'RECORDING_VOICE' && (
          <motion.div
            key="recording-status"
            className="absolute bottom-28 left-0 right-0 z-20 flex flex-col items-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.p 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-white text-sm tracking-[0.2em] font-medium uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            >
              RECORDING...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'VOICE_READY_TO_RELEASE' && (
          <motion.div
            key="voice-ready-release"
            className="absolute bottom-16 left-0 right-0 z-20 flex flex-col items-center pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            <button 
              className="px-10 py-3.5 bg-white text-black font-semibold tracking-[0.15em] text-sm rounded-full uppercase hover:bg-neutral-200 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              onClick={() => {
                setAppState('RELEASED_ORBIT');
                if (navigator.vibrate) navigator.vibrate([10, 50, 10, 80]); // Lift off haptic
              }}
            >
              RELEASE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 z-0"
        style={{ willChange: 'transform' }}
        animate={{
          scale: appState === 'FOCUSED_INITIAL' ? 1.05 : [1.02, 1, 1.02],
        }}
        transition={{
          duration: appState === 'FOCUSED_INITIAL' ? 1.5 : BREATH_DURATION,
          repeat: appState === 'FOCUSED_INITIAL' ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      >
        <BackgroundParticles isDark={isDarkPhase} />
        
        {/* Atmospheric Cosmic Void Nebulas - Hidden during dark phases except specific swirls */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[800px] bg-slate-900/30 blur-[150px] rounded-full mix-blend-screen pointer-events-none"
          animate={{ opacity: isDarkPhase ? 0 : (appState === 'FOCUSED_INITIAL' ? 0.8 : [0.6, 1, 0.6]) }}
          transition={{ duration: BREATH_DURATION, repeat: Infinity, ease: 'easeInOut' }}
          style={{ willChange: 'opacity' }}
        />
      </motion.div>

      {/* Ritual Swirling Emotion Background */}
      <AnimatePresence>
        {appState === 'RITUAL_HOLD' && (
          <motion.div
            key="ritual-swirl"
            className="absolute inset-0 z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }} // immediate dim on fail
            transition={{ duration: 1 }}
          >
            {/* Rose pink swirls drawn inward */}
            <motion.div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] rounded-full mix-blend-screen"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(255, 100, 150, 0.1) 20%, rgba(255, 50, 100, 0.3) 50%, rgba(255, 100, 150, 0.1) 80%, transparent 100%)',
                filter: 'blur(30px)',
              }}
              animate={{ rotate: 360, scale: [1.2, 0.8] }}
              transition={{ rotate: { duration: 3, repeat: Infinity, ease: 'linear' }, scale: { duration: RITUAL_HOLD_DURATION/1000, ease: 'easeIn' } }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Central Artifact */}
      <AnimatePresence>
      {(showPearl || appState === 'FRACTURE') && (
        <motion.div
          key="central-artifact"
          className="relative z-10 w-[75vw] h-[75vw] max-w-[420px] max-h-[420px] md:max-w-[500px] md:max-h-[500px] rounded-full cursor-pointer pointer-events-auto"
          style={{ willChange: 'transform' }}
          onPointerDown={handlePearlPointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          initial={{ opacity: 0, x: 0 }}
          animate={{
            x: 0,
            y: appState === 'RELEASED_ORBIT' ? -250 : isHoldingPearl ? 0 : isCoolingPhase ? 0 : [-8, 8, -8],
            scale: appState === 'RELEASED_ORBIT' ? 0 : appState === 'RITUAL_HOLD' ? 0.9 : appState === 'RECORDING_VOICE' ? 0.98 : appState === 'VOICE_READY_TO_RELEASE' ? 0.95 : (appState === 'FOCUSED_INITIAL' ? 0.96 : isCoolingPhase ? 0.9 : [1, 1.03, 1]),
            opacity: appState === 'REEMERGENCE' ? 0.3 : appState === 'RELEASED_ORBIT' ? 0 : isCoolingPhase ? 1 : 1, // Full opacity when cooled
          }}
          transition={{
            x: appState === 'RELEASED_ORBIT' ? { duration: 4, ease: [0.65, 0, 0.35, 1] } : { duration: 0.5 },
            y: appState === 'RELEASED_ORBIT' ? { duration: 4, ease: [0.65, 0, 0.35, 1] } : isCoolingPhase ? { type: 'spring', damping: 20, stiffness: 100 } : { duration: BREATH_DURATION * 1.5, repeat: Infinity, ease: 'easeInOut' },
            scale: appState === 'RELEASED_ORBIT' ? { duration: 4, ease: [0.65, 0, 0.35, 1] } : appState === 'RECORDING_VOICE' ? { type: "spring", damping: 15, stiffness: 100 } : appState === 'FOCUSED_INITIAL'
              ? { duration: 0.8, ease: 'easeOut' }
              : appState === 'RITUAL_HOLD' ? { duration: RITUAL_HOLD_DURATION / 1000, ease: 'easeInOut' }
              : isCoolingPhase ? { duration: 0.5, ease: 'easeOut' }
              : { duration: BREATH_DURATION, repeat: Infinity, ease: 'easeInOut' },
            opacity: appState === 'RELEASED_ORBIT' ? { duration: 4, ease: [0.65, 0, 0.35, 1] } : { duration: appState === 'REEMERGENCE' ? 2 : 0.5 }
          }}
        >
          
          {appState === 'FRACTURE' ? (
            <FracturedCrystal />
          ) : (
            <>
              {/* Dim Halo Prompt during REEMERGENCE */}
              <AnimatePresence>
                {appState === 'REEMERGENCE' && (
                  <motion.div 
                    key="halo-prompt"
                    className="absolute inset-0 rounded-full border border-white/20"
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 1.1, 1.2], opacity: [0, 0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </AnimatePresence>

              {/* Deep Glowing Cores */}
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20">
                <Xso3DPearl isActive={isHoldingPearl} color={appState === 'RITUAL_HOLD' || appState === 'RECORDING_VOICE' ? '#ff0055' : '#8b5cf6'} />
              </div>
            </>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
