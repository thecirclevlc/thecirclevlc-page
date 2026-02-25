import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface Particle {
  char: string;
  x: number;
  y: number;
  id: number;
}

export const ASCIIParticles: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const activeParticlesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ASCII characters for particles
    const asciiChars = ['▓', '▒', '░', '█', '▄', '▀', '■', '□', '▪', '▫', '●', '○', '◆', '◇', '★', '☆'];

    // Generate particles
    const particleCount = 60;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        char: asciiChars[Math.floor(Math.random() * asciiChars.length)],
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        id: i,
      });
    }

    particlesRef.current = particles;

    // Create particle elements
    particles.forEach((particle) => {
      const particleEl = document.createElement('div');
      particleEl.className = 'ascii-particle';
      particleEl.textContent = particle.char;
      particleEl.dataset.id = String(particle.id);
      particleEl.style.cssText = `
        position: fixed;
        left: ${particle.x}px;
        top: ${particle.y}px;
        color: #050000;
        font-size: ${16 + Math.random() * 24}px;
        font-family: monospace;
        font-weight: bold;
        pointer-events: none;
        z-index: 100;
        opacity: 0;
        user-select: none;
      `;
      container.appendChild(particleEl);
    });

    // Mouse move handler - activate particles near cursor
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      particles.forEach((particle) => {
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const activationRadius = 150;

        const particleEl = container.querySelector(`[data-id="${particle.id}"]`) as HTMLElement;
        if (!particleEl) return;

        if (distance < activationRadius && !activeParticlesRef.current.has(particle.id)) {
          activeParticlesRef.current.add(particle.id);
          activateParticle(particleEl, particle);
        }
      });
    };

    const activateParticle = (element: HTMLElement, particle: Particle) => {
      // Pulse animation
      const tl = gsap.timeline({
        onComplete: () => {
          activeParticlesRef.current.delete(particle.id);
        },
      });

      tl.to(element, {
        opacity: 0.8,
        scale: 1.5,
        duration: 0.2,
        ease: 'power2.out',
      })
        .to(element, {
          opacity: 1,
          scale: 1,
          color: '#C42121',
          duration: 0.3,
          ease: 'elastic.out(1, 0.5)',
        })
        .to(element, {
          opacity: 0,
          scale: 0.5,
          y: '-=30',
          duration: 0.5,
          ease: 'power2.in',
        });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[100]" />;
};
