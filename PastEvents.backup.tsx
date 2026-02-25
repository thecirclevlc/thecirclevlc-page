import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { pastEvents } from './events-data';

// Scroll Reveal Component
const ScrollReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
  variant?: 'fade' | 'blur' | 'scale';
}> = ({ children, delay = 0, className = "", variant = 'fade' }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const variants = {
        fade: {
            initial: { opacity: 0, y: 60 },
            animate: { opacity: 1, y: 0 }
        },
        blur: {
            initial: { opacity: 0, y: 40, filter: 'blur(10px)' },
            animate: { opacity: 1, y: 0, filter: 'blur(0px)' }
        },
        scale: {
            initial: { opacity: 0, scale: 0.9, filter: 'blur(5px)' },
            animate: { opacity: 1, scale: 1, filter: 'blur(0px)' }
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={variants[variant].initial}
            animate={isInView ? variants[variant].animate : variants[variant].initial}
            transition={{
                duration: 1.2,
                delay,
                ease: [0.16, 1, 0.3, 1]
            }}
            className={className}
            style={{ willChange: 'transform, opacity, filter' }}
        >
            {children}
        </motion.div>
    );
};

// Magnetic Button Component
const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className, onClick }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (clientX - (left + width / 2)) * 0.3;
        const y = (clientY - (top + height / 2)) * 0.3;
        setPosition({ x, y });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.button
            ref={ref}
            className={className}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            style={{ willChange: 'transform' }}
        >
            {children}
        </motion.button>
    );
};

// Event Card Component - Inspired by Obys Agency
const EventCard: React.FC<{
  event: typeof pastEvents[0];
  index: number;
  onClick: () => void;
}> = ({ event, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <ScrollReveal delay={index * 0.15} variant="scale">
      <motion.div
        className="group relative cursor-pointer"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Event Number - Top Left */}
        <motion.div
          className="absolute -top-4 -left-4 z-10 text-[#C42121] font-black text-6xl md:text-8xl opacity-20 leading-none"
          animate={{
            opacity: isHovered ? 0.4 : 0.2,
            scale: isHovered ? 1.05 : 1
          }}
          transition={{ duration: 0.3 }}
        >
          {event.number}
        </motion.div>

        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden bg-black border border-[#C42121]/20">
          <motion.img
            src={event.coverImage}
            alt={event.title}
            className="w-full h-full object-cover"
            animate={{
              scale: isHovered ? 1.08 : 1,
              filter: isHovered ? 'brightness(0.7)' : 'brightness(0.5)'
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
            animate={{ opacity: isHovered ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
          />

          {/* Hover Text Overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-[#C42121] font-black text-2xl tracking-widest">VIEW EVENT</span>
          </motion.div>
        </div>

        {/* Event Info */}
        <div className="mt-6 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-3xl md:text-4xl font-black text-[#C42121] tracking-tight leading-none">
              {event.title}
            </h3>
            <span className="text-xs font-mono text-[#C42121]/60 whitespace-nowrap pt-2">
              {event.year}
            </span>
          </div>

          {event.subtitle && (
            <p className="text-sm font-light text-[#C42121]/80 tracking-wide">
              {event.subtitle}
            </p>
          )}

          <div className="pt-3 space-y-1 text-xs font-mono text-[#C42121]/60">
            <p>{event.date}</p>
            <p>{event.location}</p>
            {event.attendees && <p>{event.attendees} Attendees</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-4">
            {event.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-3 py-1 border border-[#C42121]/30 text-[#C42121]/70 uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Line Effect */}
        <motion.div
          className="h-[1px] bg-[#C42121] mt-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'left' }}
        />
      </motion.div>
    </ScrollReveal>
  );
};

// Main Past Events Page
export default function PastEvents() {
  const navigate = useNavigate();
  const rotation = useMotionValue(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const { scrollY } = useScroll();

  // Logo rotation
  useEffect(() => {
      let lastTime = performance.now();

      const update = () => {
          const time = performance.now();
          const delta = (time - lastTime) / 1000;
          lastTime = time;
          const baseSpeed = 0.98;
          rotation.set(rotation.get() + (baseSpeed * delta));
          requestAnimationFrame(update);
      };

      const animationId = requestAnimationFrame(update);
      return () => cancelAnimationFrame(animationId);
  }, [rotation]);

  // Detect when user scrolls to bottom
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrolledToBottom = windowHeight + scrollTop >= documentHeight - 100;
      setIsAtBottom(scrolledToBottom);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleEventClick = (eventId: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/past-events/${eventId}`), 50);
  };

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1] mix-blend-overlay"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[1]"
           style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)' }}>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full bg-black/80 border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10 backdrop-blur-lg">
        <motion.div
          style={{ rotate: rotation, willChange: 'transform' }}
          className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          onClick={() => {
            window.scrollTo(0, 0);
            setTimeout(() => navigate('/'), 50);
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

        <div className="flex items-center gap-4">
          <MagneticButton
            className="border border-[#C42121] px-4 py-2 md:px-6 md:py-2 rounded-none text-[10px] md:text-xs font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
            onClick={() => {
              window.scrollTo(0, 0);
              setTimeout(() => navigate('/'), 50);
            }}
          >
            HOME
          </MagneticButton>
          <MagneticButton
            className="border border-[#C42121] px-4 py-2 md:px-6 md:py-2 rounded-none text-[10px] md:text-xs font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
            onClick={() => {
              window.scrollTo(0, 0);
              setTimeout(() => navigate('/form'), 50);
            }}
          >
            JOIN US
          </MagneticButton>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 md:px-20 py-20 md:py-32 border-b border-[#C42121]/20">
          <ScrollReveal delay={0.1} variant="blur" className="w-full max-w-7xl">
            {/* Section Number */}
            <motion.div
              className="text-[#C42121]/30 font-black text-[20vw] md:text-[15vw] leading-none mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 1.5 }}
            >
              02
            </motion.div>

            {/* Main Title */}
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] uppercase mb-8">
              <span className="block">PAST</span>
              <span className="block text-[#C42121]">EVENTS</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide">
              Each event is a unique moment in time. Explore the gatherings that shaped The Circle.
            </p>
          </ScrollReveal>
        </section>

        {/* Marquee Banner */}
        <div className="py-6 md:py-8 bg-[#C42121] text-black overflow-hidden border-y border-black">
          <motion.div
            className="whitespace-nowrap flex gap-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              repeat: Infinity,
              duration: 25,
              ease: "linear"
            }}
            style={{ willChange: 'transform' }}
          >
            {[...Array(12)].map((_, i) => (
              <span key={i} className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                PAST EVENTS • EPHEMERAL MOMENTS • 3 BILLION DOLLARS OF EXPERIENCE •
              </span>
            ))}
          </motion.div>
        </div>

        {/* Events Grid */}
        <section className="relative px-6 md:px-20 py-20 md:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
              {pastEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  onClick={() => handleEventClick(event.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20">
          <ScrollReveal delay={0.1} className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
              DON'T MISS THE<br/>
              <span className="text-[#C42121]">NEXT CHAPTER</span>
            </h2>
            <p className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed">
              The next Circle is forming. Limited spaces available.
            </p>
            <MagneticButton
              className="group relative bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] transition-all duration-300 cursor-pointer"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => navigate('/form'), 50);
              }}
            >
              APPLY NOW
            </MagneticButton>
          </ScrollReveal>
        </section>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: isAtBottom ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full p-6 md:p-8 z-40 text-[#C42121] mix-blend-exclusion"
      >
        <div className="hidden md:flex justify-between items-center font-mono text-[10px] md:text-xs opacity-50">
          <div className="text-left pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
            <a
              href="https://www.instagram.com/thecirclevlc"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block"
            >
              © 2025 THECIRCLE
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
            </a>
          </div>
          <div className="pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
            <a
              href="https://www.aliastudio.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block"
            >
              BY ALIA STUDIO
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
            </a>
          </div>
          <div className="text-right pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
            <a
              href="mailto:contact@thecirclevlc.com"
              className="relative inline-block"
            >
              contact@thecirclevlc.com
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
            </a>
          </div>
        </div>

        <div className="md:hidden font-mono text-[10px] opacity-50 space-y-4">
          <div className="flex justify-between items-center">
            <div className="pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
              <a
                href="https://www.instagram.com/thecirclevlc"
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-block"
              >
                © 2025 THECIRCLE
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
              </a>
            </div>
            <div className="text-right pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
              <a
                href="mailto:contact@thecirclevlc.com"
                className="relative inline-block"
              >
                contact@thecirclevlc.com
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
              </a>
            </div>
          </div>
          <div className="text-center pointer-events-auto group transition-opacity duration-300 hover:opacity-100">
            <a
              href="https://www.aliastudio.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-block"
            >
              BY ALIA STUDIO
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#C42121] group-hover:w-full transition-all duration-500 ease-out" />
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
