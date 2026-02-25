import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export const ASCIICircle: React.FC = () => {
  const circleRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    // ASCII characters for the circle
    const asciiChars = ['●', '○', '◉', '◎', '⦿', '⊙', '⊚', '⊛', '⊜', '⊝'];

    // Create particles in a circular pattern
    const radius = 120;
    const centerX = 150;
    const centerY = 150;
    const particleCount = 80;

    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const particle = document.createElement('span');
      particle.textContent = asciiChars[Math.floor(Math.random() * asciiChars.length)];
      particle.className = 'ascii-particle-dot';
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        color: #050000;
        font-size: ${12 + Math.random() * 8}px;
        font-family: monospace;
        font-weight: bold;
        transform: translate(-50%, -50%);
        opacity: 0.3;
      `;

      circle.appendChild(particle);
      particlesRef.current.push(particle);
    }

    // Hover animation
    const handleMouseEnter = () => {
      // Wave animation - particles turn red and pulse in waves
      particlesRef.current.forEach((particle, i) => {
        gsap.to(particle, {
          color: '#C42121',
          opacity: 1,
          scale: 1.5,
          duration: 0.6,
          delay: i * 0.008, // Stagger for wave effect
          ease: 'power2.out',
        });

        // Add rotation to some particles
        if (i % 3 === 0) {
          gsap.to(particle, {
            rotation: 360,
            duration: 1.2,
            delay: i * 0.008,
            ease: 'power1.inOut',
          });
        }
      });

      // Circle expansion pulse
      gsap.to(circle, {
        scale: 1.1,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
      });
    };

    const handleMouseLeave = () => {
      // Reset animation - particles fade back to black
      particlesRef.current.forEach((particle, i) => {
        gsap.to(particle, {
          color: '#050000',
          opacity: 0.3,
          scale: 1,
          rotation: 0,
          duration: 0.8,
          delay: (particlesRef.current.length - i) * 0.005, // Reverse wave
          ease: 'power2.inOut',
        });
      });

      gsap.to(circle, {
        scale: 1,
        duration: 0.6,
        ease: 'power2.inOut',
      });
    };

    circle.addEventListener('mouseenter', handleMouseEnter);
    circle.addEventListener('mouseleave', handleMouseLeave);

    // Idle subtle animation - gentle breathing effect
    gsap.to(circle, {
      scale: 1.02,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    return () => {
      circle.removeEventListener('mouseenter', handleMouseEnter);
      circle.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={circleRef}
      className="relative cursor-pointer"
      style={{
        width: '300px',
        height: '300px',
      }}
    />
  );
};
