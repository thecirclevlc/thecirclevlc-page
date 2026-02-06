import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);
  const [pulses, setPulses] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Don't setup cursor on mobile
    if (isMobile) return;
    const cursor = cursorRef.current;
    const cursorDot = cursorDotRef.current;
    if (!cursor || !cursorDot) return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let dotX = 0;
    let dotY = 0;

    // Smooth cursor follow with GSAP
    const animateCursor = () => {
      // Main cursor follows with delay
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;

      // Dot follows faster
      dotX += (mouseX - dotX) * 0.3;
      dotY += (mouseY - dotY) * 0.3;

      gsap.set(cursor, {
        x: cursorX,
        y: cursorY,
      });

      gsap.set(cursorDot, {
        x: dotX,
        y: dotY,
      });

      requestAnimationFrame(animateCursor);
    };

    animateCursor();

    // Update mouse position
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    // Handle click - create pulse effect
    const handleClick = (e: MouseEvent) => {
      const id = Date.now();
      setPulses((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);

      // Cursor dot pulse on click
      gsap.to(cursorDot, {
        scale: 1.5,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(cursorDot, {
            scale: 1,
            duration: 0.3,
            ease: 'elastic.out(1, 0.3)',
          });
        },
      });

      // Remove pulse after animation
      setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p.id !== id));
      }, 1000);
    };

    // Cursor scale on hover interactive elements
    const handleMouseEnter = () => {
      gsap.to(cursor, {
        scale: 1.5,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(cursorDot, {
        scale: 0.5,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(cursor, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
      gsap.to(cursorDot, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // Add hover listeners to interactive elements
    const interactiveElements = document.querySelectorAll('a, button, [role="button"]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Don't render cursor on mobile
  if (isMobile) return null;

  return (
    <>
      {/* Main cursor circle */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-full h-full rounded-full border-2 border-[#C42121] opacity-50" />
      </div>

      {/* Cursor dot */}
      <div
        ref={cursorDotRef}
        className="fixed top-0 left-0 w-2 h-2 pointer-events-none z-[9999]"
        style={{
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-full h-full rounded-full bg-[#C42121]" />
      </div>

      {/* Click pulses */}
      {pulses.map((pulse) => (
        <Pulse key={pulse.id} x={pulse.x} y={pulse.y} />
      ))}
    </>
  );
};

// Pulse component for click effect
const Pulse: React.FC<{ x: number; y: number }> = React.memo(({ x, y }) => {
  const pulseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pulse = pulseRef.current;
    if (!pulse) return;

    gsap.fromTo(
      pulse,
      {
        scale: 0,
        opacity: 1,
      },
      {
        scale: 3,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      }
    );
  }, []);

  return (
    <div
      ref={pulseRef}
      className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-[9998]"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="w-full h-full rounded-full border-2 border-[#C42121] opacity-70" />
    </div>
  );
});
