import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, animate } from 'motion/react';

export interface XsoVideoWindowProps {
  src: string;
  title?: string;
}

const NOISE_SVG = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

export function XsoVideoWindow({ src, title }: XsoVideoWindowProps) {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPeeled, setIsPeeled] = useState(false);

  // --- Parallax / Gyro States ---
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const smoothTiltX = useSpring(tiltX, { stiffness: 100, damping: 20 });
  const smoothTiltY = useSpring(tiltY, { stiffness: 100, damping: 20 });

  // --- Flexible 2D Paper Physics ---
  const dragX = useMotionValue(0); 
  const dragY = useMotionValue(0);
  
  const snapX = useSpring(dragX, { stiffness: 80, damping: 15, mass: 1.2 });
  const snapY = useSpring(dragY, { stiffness: 80, damping: 15, mass: 1.2 });

  // --- Core Geometric Fold Calculations ---
  const foldParams = useTransform(() => {
    let dx = snapX.get();
    let dy = snapY.get();
    
    // Clamp to prevent divide-by-zero or inversion when reaching pure (0,0) exactly
    if (dx > -1) dx = -1;
    if (dy < 1) dy = 1;

    const dRight = -dx;
    const crossTop = (dRight / 2) + ((dy * dy) / (2 * dRight));
    const crossRight = (dy / 2) + ((dRight * dRight) / (2 * dy));

    const midX = -crossTop / 2; 
    const midY = crossRight / 2;

    const angleRad = Math.atan2(crossRight, crossTop); 
    const angleDeg = angleRad * (180 / Math.PI); 

    const mainPolygon = `polygon(0px 0px, calc(100% - ${crossTop}px) 0px, 100% ${crossRight}px, 100% 100%, 0px 100%)`;
    const flapPolygon = `polygon(calc(100% - ${crossTop}px) 0px, 100% ${crossRight}px, calc(100% + ${dx}px) ${dy}px)`;

    return { dx, dy, crossTop, crossRight, midX, midY, angleDeg, mainPolygon, flapPolygon };
  });

  const mainClipPath = useTransform(() => foldParams.get().mainPolygon);
  const flapClipPath = useTransform(() => foldParams.get().flapPolygon);
  
  const flapTranslateX = useTransform(() => `calc(100% + ${foldParams.get().midX}px)`);
  const flapTranslateY = useTransform(() => `${foldParams.get().midY}px`);
  const flapRotateZ = useTransform(() => `${foldParams.get().angleDeg}deg`);

  // Strict Playback State
  useEffect(() => {
    if (isPeeled && mainVideoRef.current) {
        mainVideoRef.current.currentTime = 0;
        mainVideoRef.current.play().catch(()=>{});
    } else if (!isPeeled && mainVideoRef.current) {
        mainVideoRef.current.pause();
        mainVideoRef.current.currentTime = 0;
    }
  }, [isPeeled]);

  // Subtle Gyroscope Parallax
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let bx = e.gamma || 0; 
      let by = e.beta || 0; 
      bx = Math.max(-30, Math.min(30, bx));
      by = Math.max(-30, Math.min(30, by));
      tiltX.set(-bx * 0.5);
      tiltY.set(-by * 0.5);
    };

    if (window.DeviceOrientationEvent) {
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

  // --- Peel Interaction ---
  const startX = useRef(0);
  const startY = useRef(0);

  const handlePanStart = () => {
    startX.current = dragX.get();
    startY.current = dragY.get();
  };

  const handlePan = (e: any, info: any) => {
    if (isPeeled) return;
    
    // Calculate new position based on pointer delta
    const newX = Math.min(0, startX.current + info.offset.x);
    const newY = Math.max(0, startY.current + info.offset.y);
    
    dragX.set(newX);
    dragY.set(newY);

    if (Math.random() < 0.15 && navigator.vibrate) {
      navigator.vibrate([1, 2]);
    }
  };

  const handlePanEnd = (e: any, info: any) => {
    if (isPeeled) return;
    const width = containerRef.current?.offsetWidth || 300;
    const height = containerRef.current?.offsetHeight || 300;
    
    // If they drag past the diagonal center (or heavy flick)
    if (dragX.get() < -width * 0.5 || info.velocity.x < -600) {
      setIsPeeled(true);
      if (navigator.vibrate) navigator.vibrate([15, 40]);
      
      // Animate off-screen into the distance
      animate(dragX, -width * 2.5, { type: "spring", stiffness: 150, damping: 20 });
      animate(dragY, height * 1.5, { type: "spring", stiffness: 150, damping: 20 });
    } else {
      // Snap back to top-right
      animate(dragX, 0, { type: "spring", stiffness: 150, damping: 20 });
      animate(dragY, 0, { type: "spring", stiffness: 150, damping: 20 });
    }
  };

  return (
    <div className="relative w-full h-[80vh] flex flex-col items-center justify-center pointer-events-auto" ref={containerRef}>
       
       <motion.div 
          className="relative w-[85vw] md:w-[60vw] max-h-[70vh] aspect-video flex-shrink-0"
          style={{ x: smoothTiltX, y: smoothTiltY }}
       >
          {/* Main Container */}
          <div className="relative z-10 w-full h-full rounded-xl md:rounded-2xl border border-white/10 shadow-[0_30px_60px_-10px_rgba(0,0,0,0.9)] bg-black overflow-hidden">
              
             {/* Base Video */}
             <video 
                 ref={mainVideoRef}
                 src={src}
                 className="absolute inset-0 z-0 w-full h-full object-cover rounded-xl md:rounded-2xl"
                 loop
                 playsInline
                 // NO AUTO PLAY
             />

             {/* The 2D Masking Paper Magic */}
             <AnimatePresence>
                 {!isPeeled && (
                     <>
                         {/* The base frosted veil covering the rest of the screen */}
                         <motion.div 
                             key="base-frosted-veil"
                             className="absolute inset-0 z-20 pointer-events-none"
                             style={{ clipPath: mainClipPath }}
                             exit={{ opacity: 0, transition: { duration: 0.5 } }}
                         >
                             {/* The Mysterious "God Light" (Pre-Peel Backlight) */}
                             <motion.div 
                                 className="absolute inset-0 z-0 pointer-events-none mix-blend-screen"
                                 style={{
                                     background: "radial-gradient(circle, rgba(255,230,150,0.95) 0%, rgba(255,150,50,0.5) 50%, transparent 80%)",
                                     filter: "blur(60px)"
                                 }}
                                 initial={{ opacity: 0, scale: 1 }}
                                 animate={{ opacity: 1, scale: [1, 1.05, 1] }}
                                 transition={{
                                     scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                                 }}
                             />

                             <div className="w-full h-full bg-[#fdfcf0]/10 backdrop-blur-3xl relative flex items-center justify-center z-10">
                                 {/* Paper Noise Texture */}
                                 <div 
                                     className="absolute inset-0 opacity-[0.35] mix-blend-multiply" 
                                     style={{ backgroundImage: `url("${NOISE_SVG}")` }} 
                                 />
                                 
                                 {/* Static text affordance */}
                                 <div className="absolute bottom-6 right-8 md:bottom-8 md:right-10 pointer-events-none">
                                     <span className="text-[10px] md:text-sm tracking-[0.4em] uppercase text-black/60 font-semibold drop-shadow-md">Peel To Reveal</span>
                                 </div>
                             </div>
                         </motion.div>

                         {/* The separate, physics-driven curled flap bounding box */}
                         <motion.div
                             key="curled-flap"
                             className="absolute inset-0 z-30 pointer-events-none"
                             style={{ filter: "drop-shadow(-12px 12px 25px rgba(0,0,0,0.7))" }}
                             exit={{ opacity: 0, transition: { duration: 0.5 } }}
                         >
                             {/* Bounding clip-path to strictly trim the flap to the geometric triangle */}
                             <motion.div className="absolute inset-0" style={{ clipPath: flapClipPath }}>
                                 {/* The HINGED Flap Container - Rotated and Translated */}
                                 <motion.div
                                     className="absolute top-0 left-0 w-0 h-0"
                                     style={{
                                         x: flapTranslateX,
                                         y: flapTranslateY,
                                         rotateZ: flapRotateZ,
                                     }}
                                 >
                                     {/* The actual frosted paper background with Cylindrical Gradient */}
                                     <div 
                                        className="absolute"
                                        style={{
                                            left: "-100vw", // Span backwards infinitely from the midpoint
                                            top: "0px", // Hinge starts at 0 and goes downwards (over the fold)
                                            width: "200vw",
                                            height: "200vh",
                                            // Hyper-realistic Cylindrical Gradient
                                            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 10%, rgba(255,255,255,0.2) 40%, rgba(100,100,100,0.4) 100%)",
                                            backdropFilter: "blur(12px)", // backdrop-blur-md equivalent
                                        }}
                                     >
                                         <div 
                                             className="absolute inset-0 opacity-[0.3] mix-blend-multiply" 
                                             style={{ backgroundImage: `url("${NOISE_SVG}")` }} 
                                         />
                                     </div>
                                 </motion.div>
                             </motion.div>
                         </motion.div>
                     </>
                 )}

                 {/* Invisible Drag Surface - Always at front */}
                 {!isPeeled && (
                     <motion.div
                         key="drag-surface"
                         onPanStart={handlePanStart}
                         onPan={handlePan}
                         onPanEnd={handlePanEnd}
                         className="absolute inset-0 z-40 cursor-grab active:cursor-grabbing touch-none"
                     />
                 )}
             </AnimatePresence>
          </div>
       </motion.div>

       {/* Movie Titles */}
       <div className="absolute bottom-8 flex flex-col items-center z-20 pointer-events-none w-full px-6 text-center">
            {title && (
                <h3 className="text-xl md:text-2xl font-serif text-white opacity-90 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] mb-6">
                    {title}
                </h3>
            )}
       </div>
    </div>
  );
}

