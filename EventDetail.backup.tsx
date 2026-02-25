import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useInView, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { getEventById, pastEvents } from './events-data';

// Scroll Reveal Component
const ScrollReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
  variant?: 'fade' | 'blur' | 'slideUp';
}> = ({ children, delay = 0, className = "", variant = 'fade' }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    const variants = {
        fade: {
            initial: { opacity: 0, y: 40 },
            animate: { opacity: 1, y: 0 }
        },
        blur: {
            initial: { opacity: 0, y: 40, filter: 'blur(10px)' },
            animate: { opacity: 1, y: 0, filter: 'blur(0px)' }
        },
        slideUp: {
            initial: { opacity: 0, y: 80 },
            animate: { opacity: 1, y: 0 }
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

// Image Gallery Component with Parallax
const ImageGallery: React.FC<{ images: string[] }> = ({ images }) => {
  return (
    <div className="space-y-12 md:space-y-20">
      {images.map((image, index) => (
        <ScrollReveal key={index} delay={index * 0.1} variant="blur">
          <div className="relative aspect-[16/10] overflow-hidden bg-black border border-[#C42121]/20">
            <motion.img
              src={image}
              alt={`Event image ${index + 1}`}
              className="w-full h-full object-cover"
              initial={{ scale: 1.1, filter: 'brightness(0.4)' }}
              whileInView={{ scale: 1, filter: 'brightness(0.6)' }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
};

// Main Event Detail Page
export default function EventDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const event = eventId ? getEventById(eventId) : undefined;
  const rotation = useMotionValue(0);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const { scrollY } = useScroll();

  // Find next event
  const currentIndex = pastEvents.findIndex(e => e.id === eventId);
  const nextEvent = currentIndex >= 0 && currentIndex < pastEvents.length - 1
    ? pastEvents[currentIndex + 1]
    : pastEvents[0];

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

  // Parallax effect for hero image
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: false });
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  if (!event) {
    return (
      <div className="min-h-screen bg-[#050000] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#C42121] mb-4">EVENT NOT FOUND</h1>
          <MagneticButton
            className="border border-[#C42121] px-8 py-3 text-sm font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
            onClick={() => navigate('/past-events')}
          >
            BACK TO EVENTS
          </MagneticButton>
        </div>
      </div>
    );
  }

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
              setTimeout(() => navigate('/past-events'), 50);
            }}
          >
            BACK
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
        <section ref={heroRef} className="relative h-screen flex items-end overflow-hidden">
          {/* Background Image with Parallax */}
          <motion.div
            className="absolute inset-0 z-0"
            style={{ y: heroY }}
          >
            <motion.img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-[110%] object-cover"
              initial={{ scale: 1.1, filter: 'brightness(0.3)' }}
              animate={{ scale: 1, filter: 'brightness(0.4)' }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050000] via-[#050000]/60 to-transparent" />
          </motion.div>

          {/* Hero Content */}
          <div className="relative z-10 w-full px-6 md:px-20 pb-20 md:pb-32">
            <ScrollReveal delay={0.3} variant="blur">
              {/* Event Number */}
              <motion.div
                className="text-[#C42121]/40 font-black text-[15vw] md:text-[10vw] leading-none mb-4"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 0.4, x: 0 }}
                transition={{ duration: 1.2, delay: 0.2 }}
              >
                {event.number}
              </motion.div>

              {/* Title */}
              <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase mb-6">
                {event.title}
              </h1>

              {/* Subtitle */}
              {event.subtitle && (
                <p className="text-2xl md:text-4xl font-light text-[#C42121]/80 mb-8 tracking-wide">
                  {event.subtitle}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-8 text-sm md:text-base font-mono text-[#C42121]/70">
                <div>
                  <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">DATE</span>
                  {event.date}
                </div>
                <div>
                  <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">LOCATION</span>
                  {event.location}
                </div>
                {event.attendees && (
                  <div>
                    <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">ATTENDEES</span>
                    {event.attendees}
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Description Section */}
        <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20">
              {/* Left - Short Description */}
              <ScrollReveal delay={0.1} variant="fade">
                <div className="space-y-8">
                  <div className="text-5xl md:text-6xl font-black tracking-tight leading-[1.1]">
                    A NIGHT<br/>
                    <span className="text-[#C42121]">TO REMEMBER</span>
                  </div>
                  <p className="text-lg md:text-xl font-light text-[#C42121]/80 leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </ScrollReveal>

              {/* Right - Tags and Lineup */}
              <ScrollReveal delay={0.2} variant="fade">
                <div className="space-y-12">
                  {/* Tags */}
                  <div>
                    <h3 className="text-sm font-mono text-[#C42121]/50 mb-4 tracking-wider">EXPERIENCE</h3>
                    <div className="flex flex-wrap gap-3">
                      {event.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs font-mono px-4 py-2 border border-[#C42121]/30 text-[#C42121]/80 uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Lineup */}
                  {event.lineup && event.lineup.length > 0 && (
                    <div>
                      <h3 className="text-sm font-mono text-[#C42121]/50 mb-4 tracking-wider">LINEUP</h3>
                      <div className="space-y-2">
                        {event.lineup.map((artist, i) => (
                          <div key={i} className="text-lg font-light text-[#C42121]/90 border-l-2 border-[#C42121]/30 pl-4">
                            {artist}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Long Description Section */}
        <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20 bg-black/30">
          <div className="max-w-5xl mx-auto space-y-8">
            {event.longDescription.map((paragraph, index) => (
              <ScrollReveal key={index} delay={index * 0.1} variant="slideUp">
                <p className="text-lg md:text-2xl font-light text-[#C42121]/80 leading-relaxed">
                  {paragraph}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Image Gallery */}
        <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20">
          <div className="max-w-7xl mx-auto">
            <ImageGallery images={event.images} />
          </div>
        </section>

        {/* Next Event Section */}
        {nextEvent && (
          <section className="relative border-t border-[#C42121]/20">
            <ScrollReveal delay={0.1}>
              <div
                className="group relative h-[60vh] md:h-[80vh] overflow-hidden cursor-pointer"
                onClick={() => {
                  window.scrollTo(0, 0);
                  setTimeout(() => navigate(`/past-events/${nextEvent.id}`), 50);
                }}
              >
                {/* Background Image */}
                <motion.img
                  src={nextEvent.coverImage}
                  alt={nextEvent.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ scale: 1, filter: 'brightness(0.3)' }}
                  whileHover={{ scale: 1.05, filter: 'brightness(0.5)' }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050000] via-[#050000]/70 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    className="text-sm font-mono text-[#C42121]/60 mb-4 tracking-widest"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    NEXT EVENT
                  </motion.div>
                  <motion.h2
                    className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase mb-6"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  >
                    {nextEvent.title}
                  </motion.h2>
                  <motion.div
                    className="text-lg md:text-xl font-light text-[#C42121]/80"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  >
                    {nextEvent.subtitle}
                  </motion.div>

                  {/* View Arrow */}
                  <motion.div
                    className="mt-12 text-4xl text-[#C42121]"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    ↓
                  </motion.div>
                </div>
              </div>
            </ScrollReveal>
          </section>
        )}

        {/* Back to Events CTA */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20 text-center">
          <ScrollReveal delay={0.1}>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase">
              EXPLORE MORE<br/>
              <span className="text-[#C42121]">PAST EVENTS</span>
            </h2>
            <MagneticButton
              className="border border-[#C42121] px-12 py-4 text-sm font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => navigate('/past-events'), 50);
              }}
            >
              VIEW ALL EVENTS
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
