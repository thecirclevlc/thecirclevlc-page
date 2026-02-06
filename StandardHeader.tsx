import React, { useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu';

export const StandardHeader: React.FC = () => {
  const navigate = useNavigate();
  const rotation = useMotionValue(0);

  // Rotation animation
  useEffect(() => {
    let lastTime = performance.now();

    const update = () => {
      const time = performance.now();
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const baseSpeed = 0.98;
      rotation.set(rotation.get() + baseSpeed * delta);
      requestAnimationFrame(update);
    };

    const animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [rotation]);

  return (
    <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-[100] h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
      {/* Logo Circle - Small */}
      <motion.div
        style={{ rotate: rotation }}
        className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer"
        onClick={() => {
          window.scrollTo(0, 0);
          navigate('/');
        }}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
          <defs>
            <path id="circlePathSmall" d="M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0" fill="none" />
          </defs>
          <text fill="#C42121" className="uppercase" style={{ fontSize: '52px', letterSpacing: '-0.16em' }}>
            <textPath href="#circlePathSmall" startOffset="0%">
              <tspan style={{ fontWeight: 900 }}>THECIRCLE</tspan>
              <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
              <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
            </textPath>
          </text>
        </svg>
      </motion.div>

      <HamburgerMenu />
    </header>
  );
};
