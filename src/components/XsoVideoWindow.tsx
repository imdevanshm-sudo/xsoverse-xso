import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';

export interface XsoVideoWindowProps {
  src: string;
  title?: string;
}

export function XsoVideoWindow({ src, title }: XsoVideoWindowProps) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const blurVideoRef = useRef<HTMLVideoElement>(null);
  
  const [hasScrubbed, setHasScrubbed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // --- Haptic Scrubbing State ---
  const lastHapticSecond = useRef(0);
  const isScrubbingRef = useRef(false);

  // --- Parallax / Gyro States ---
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const smoothTiltX = useSpring(tiltX, { stiffness: 100, damping: 20 });
  const smoothTiltY = useSpring(tiltY, { stiffness: 100, damping: 20 });

  useEffect(() => {
    // Attempt auto-play when component mounts
    if (mainVideoRef.current && blurVideoRef.current) {
        blurVideoRef.current.muted = true; // Background video strictly muted
        
        mainVideoRef.current.play().catch(e => {
            console.warn("Video autoplay blocked. Will require interaction.", e);
            setIsPlaying(false);
        });
        blurVideoRef.current.play().catch(()=>{});
    }

    // Sync videos (in case they drift)
    const syncInterval = setInterval(() => {
        if (mainVideoRef.current && blurVideoRef.current && !isScrubbingRef.current) {
           if (Math.abs(mainVideoRef.current.currentTime - blurVideoRef.current.currentTime) > 0.2) {
               blurVideoRef.current.currentTime = mainVideoRef.current.currentTime;
           }
        }
    }, 2000);

    return () => clearInterval(syncInterval);
  }, [src]);


  // --- Subtle Gyroscope Parallax ---
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Map beta (front/back tilt) and gamma (left/right tilt) to small movements
      let bx = e.gamma || 0; // -90 to 90
      let by = e.beta || 0;  // -180 to 180

      // Clamp them
      bx = Math.max(-30, Math.min(30, bx));
      by = Math.max(-30, Math.min(30, by));

      // Inverse subtle movement
      tiltX.set(-bx * 0.5);
      tiltY.set(-by * 0.5);
    };

    if (window.DeviceOrientationEvent) {
      // Request permission for iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((state: string) => {
             if (state === 'granted') {
                 window.addEventListener('deviceorientation', handleOrientation);
             }
          }).catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // --- Pan / Scrub Handling ---
  const handlePanStart = () => {
    isScrubbingRef.current = true;
    setHasScrubbed(true);
    if (mainVideoRef.current) {
        mainVideoRef.current.pause();
        setIsPlaying(false);
    }
    if (blurVideoRef.current) {
        blurVideoRef.current.pause();
    }
  };

  const handlePan = (e: any, info: any) => {
    const vid = mainVideoRef.current;
    const blurVid = blurVideoRef.current;
    if (!vid || !blurVid || isNaN(vid.duration)) return;

    // Map horizontal pixel distance to seconds.
    // E.g., moving 10px scrubs 1 second. Adjust scaling factor as needed.
    const scrubScale = 0.05; 
    
    // We calculate the delta from the current video time, not absolute pixel -> time map
    // Note: Framer motion passes `info.delta.x` for frame-by-frame changes
    const timeDelta = info.delta.x * scrubScale;
    
    let newTime = vid.currentTime + timeDelta;
    newTime = Math.max(0, Math.min(vid.duration, newTime));

    vid.currentTime = newTime;
    blurVid.currentTime = newTime;

    // Haptics per second crossed
    const currentSecond = Math.floor(newTime);
    if (currentSecond !== lastHapticSecond.current) {
         if (navigator.vibrate) navigator.vibrate(5);
         lastHapticSecond.current = currentSecond;
    }
  };

  const handlePanEnd = () => {
     isScrubbingRef.current = false;
     // Resume play on release if it's not at the very end
     if (mainVideoRef.current && mainVideoRef.current.currentTime < mainVideoRef.current.duration) {
         mainVideoRef.current.play().catch(()=>{});
         setIsPlaying(true);
     }
     if (blurVideoRef.current) {
         blurVideoRef.current.play().catch(()=>{});
     }
  };


  return (
    <div className="relative w-full h-[80vh] flex flex-col items-center justify-center pointer-events-auto touch-pan-y">
       
       <motion.div 
          className="relative w-[85vw] md:w-[60vw] max-h-[70vh] aspect-video flex-shrink-0"
          style={{
             x: smoothTiltX,
             y: smoothTiltY
          }}
       >
          {/* Ambilight Blur Background */}
          <video 
             ref={blurVideoRef}
             src={src}
             className="absolute md:block hidden inset-0 w-full h-full object-cover rounded-xl pointer-events-none scale-110 opacity-50 blur-[80px] mix-blend-screen saturate-150"
             muted
             loop
             playsInline
          />

          {/* Main Video Surface */}
          <motion.div 
             className="relative w-full h-full rounded-xl md:rounded-2xl border border-white/10 overflow-hidden shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] bg-black touch-none cursor-grab active:cursor-grabbing"
             onPanStart={handlePanStart}
             onPan={handlePan}
             onPanEnd={handlePanEnd}
          >
             <video 
                 ref={mainVideoRef}
                 src={src}
                 className="w-full h-full object-cover"
                 loop
                 playsInline // Muted removed to hear audio if present. Relies on browser autoplay policy.
             />
          </motion.div>
       </motion.div>

       {/* Subtitles / Affordances */}
       <div className="absolute bottom-8 flex flex-col items-center z-20 pointer-events-none w-full px-6 text-center">
            {title && (
                <h3 className="text-xl md:text-2xl font-serif text-white opacity-90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-6">
                    {title}
                </h3>
            )}
            
            <AnimatePresence>
                {!hasScrubbed && (
                    <motion.div
                        initial={{ opacity: 0.3 }}
                        animate={{ opacity: 0.8 }}
                        exit={{ opacity: 0, transition: { duration: 0.5 } }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    >
                        <p className="text-[10px] md:text-xs tracking-[0.4em] uppercase text-white/40 drop-shadow-md">Drag to Scrub</p>
                    </motion.div>
                )}
            </AnimatePresence>
       </div>
    </div>
  );
}
