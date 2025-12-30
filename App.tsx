import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useScroll, useTransform, useVelocity, useSpring, useInView } from 'framer-motion';
// Icons no longer needed
import { useNavigate } from 'react-router-dom';

// Smooth scroll utility - Extra slow and smooth (50% slower)
let scrollAnimationId: number | null = null;
let isScrolling = false;

const smoothScrollTo = (target: number, duration: number = 2250) => {
  // Cancel any ongoing scroll animation
  if (scrollAnimationId !== null) {
    cancelAnimationFrame(scrollAnimationId);
  }

  const start = window.pageYOffset;
  const distance = target - start;
  const startTime = performance.now();
  isScrolling = true;

  const easeInOutCubic = (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const scroll = (currentTime: number) => {
    if (!isScrolling) {
      scrollAnimationId = null;
      return;
    }

    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easing = easeInOutCubic(progress);
    
    window.scrollTo(0, start + distance * easing);
    
    if (progress < 1) {
      scrollAnimationId = requestAnimationFrame(scroll);
    } else {
      scrollAnimationId = null;
      isScrolling = false;
    }
  };

  scrollAnimationId = requestAnimationFrame(scroll);

  // Cancel animation if user tries to scroll manually
  const cancelScroll = () => {
    isScrolling = false;
    if (scrollAnimationId !== null) {
      cancelAnimationFrame(scrollAnimationId);
      scrollAnimationId = null;
    }
  };

  // Listen for user scroll attempts
  const handleUserScroll = (e: WheelEvent | TouchEvent) => {
    cancelScroll();
  };

  window.addEventListener('wheel', handleUserScroll, { passive: true, once: true });
  window.addEventListener('touchmove', handleUserScroll, { passive: true, once: true });
};

// --- SHADERS (NATIVE WEBGL) ---
// Vertex Shader: Standard Fullscreen Quad
const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Fragment Shader: Grid with wave distortion and chaos effect
const fragmentShaderSource = `
precision mediump float;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uChaos;

varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 st = vUv;
  
  // Aspect ratio correction
  float aspect = uResolution.x / uResolution.y;
  st.x *= aspect;
  vec2 mouse = uMouse;
  mouse.x *= aspect;

  // Distance from mouse
  float dist = distance(st, mouse);
  
  // Normal wave ripple effect
  float decay = clamp(1.0 - dist * 3.0, 0.0, 1.0);
  float normalRipple = sin(dist * 40.0 - uTime * 5.0) * 0.03 * decay;
  
  // Chaos effect - destruction
  float chaosNoise = (random(st * uTime) - 0.5) * uChaos * 0.2;
  float chaosRipple = sin(dist * (40.0 + uChaos * 100.0) - uTime * 20.0) * (0.03 + uChaos * 0.5);
  
  // Mix effects
  vec2 distortedSt = vUv + normalRipple + chaosRipple + chaosNoise;
  
  // Draw Grid
  float gridSize = 40.0;
  vec2 gridUV = distortedSt * gridSize;
  float thickness = 0.02 + (uChaos * 0.1); 
  vec2 gridLine = smoothstep(0.5 - thickness, 0.5, fract(gridUV)) * 
                  smoothstep(0.5 + thickness, 0.5, fract(gridUV));
  
  float lines = max(gridLine.x, gridLine.y);
  
  // Colors
  vec3 black = vec3(0.02, 0.0, 0.01);
  vec3 red = vec3(0.769, 0.129, 0.129); // #C42121
  
  // Color mixing - during chaos, color becomes more intense
  vec3 color = mix(black, red, lines * (0.2 + decay * 0.8 + uChaos));

  gl_FragColor = vec4(color, 1.0);
}
`;

// --- Components ---

// 1. WebGL Background
const WebGLBackground: React.FC<{ chaosLevel: number }> = ({ chaosLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Shader Compilation Utility
    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Buffers (Full screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uMouseLoc = gl.getUniformLocation(program, 'uMouse');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uChaosLoc = gl.getUniformLocation(program, 'uChaos');

    let mouse = { x: 0.5, y: 0.5 };
    let targetMouse = { x: 0.5, y: 0.5 };
    let startTime = performance.now();
    let animationId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = window.innerHeight - e.clientY; // Invert Y for WebGL
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    // Render Loop
    const render = () => {
      const time = (performance.now() - startTime) * 0.001;
      
      // Smooth mouse lerp
      mouse.x += (targetMouse.x - mouse.x) * 0.08;
      mouse.y += (targetMouse.y - mouse.y) * 0.08;

      gl.uniform1f(uTimeLoc, time);
      gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
      // uChaos is updated via a property attached to the canvas element for bridge
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };
    render();

    // Bridge for React State -> WebGL Uniform
    (canvas as any).updateChaos = (val: number) => {
        gl.useProgram(program);
        gl.uniform1f(uChaosLoc, val);
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      gl.deleteProgram(program);
    };
  }, []);

  // Sync chaos prop
  useEffect(() => {
    if (canvasRef.current && (canvasRef.current as any).updateChaos) {
        (canvasRef.current as any).updateChaos(chaosLevel);
    }
  }, [chaosLevel]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" 
    />
  );
};

// 2. Magnetic Button Component (Enhanced with ripple effect)
const MagneticButton: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  type?: "button" | "submit"; 
  disabled?: boolean;
  onClick?: () => void;
}> = ({ children, className, type = "button", disabled, onClick }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

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

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { x, y, id }]);
        setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
        
        if (onClick) onClick();
    };

    return (
        <motion.button
            ref={ref}
            type={type}
            disabled={disabled}
            className={`${className} relative`}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            style={{ willChange: 'transform' }}
        >
            {ripples.map(ripple => (
                <span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 0,
                        height: 0,
                    }}
                />
            ))}
            {children}
        </motion.button>
    );
};

// 3. Scroll Reveal Component - Enhanced with mysterious reveal
const ScrollReveal: React.FC<{ 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
  variant?: 'fade' | 'blur' | 'glitch';
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
        glitch: {
            initial: { opacity: 0, x: -20, filter: 'blur(4px)' },
            animate: { opacity: 1, x: 0, filter: 'blur(0px)' }
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={variants[variant].initial}
            animate={isInView ? variants[variant].animate : variants[variant].initial}
            transition={{
                duration: 1.4,
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

// --- Main App ---
export default function TheCircleApp() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const rotation = useMotionValue(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  
  // Scroll-based animations
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 3], { clamp: false });
  
  // Scale down on scroll
  const scale = useTransform(scrollY, [0, 500], [1, 0.7]);
  const circleScale = useSpring(scale, { damping: 30, stiffness: 300 });
  
  // Initial load animation
  useEffect(() => {
    setHasLoaded(true);
  }, []);

  // Hide grid after 3 seconds automatically
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGrid(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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
  
  // Rotation with scroll influence - 40% faster base speed + scroll boost
  useEffect(() => {
      let lastTime = performance.now();
      
      const update = () => {
          const time = performance.now();
          const delta = (time - lastTime) / 1000; // seconds
          lastTime = time;

          // Base rotation: 0.98 degrees per second (40% faster than 0.7)
          const baseSpeed = 0.98;
          
          // Add scroll velocity boost
          const scrollBoost = velocityFactor.get();
          const totalSpeed = baseSpeed + (scrollBoost * 0.5);
          
          rotation.set(rotation.get() + (totalSpeed * delta));

          requestAnimationFrame(update);
      };
      
      const animationId = requestAnimationFrame(update);
      return () => cancelAnimationFrame(animationId);
  }, [rotation, velocityFactor]);


  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black cursor-crosshair overflow-hidden">
      
      {/* Background Layer */}
      <motion.div
        animate={{ opacity: showGrid ? 1 : 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <WebGLBackground chaosLevel={0} />
      </motion.div>
      
      {/* Noise Overlay (CSS) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Subtle Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[1]" 
           style={{ 
             background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
           }}>
      </div>

      {/* Sticky Header Bar */}
      <header className="fixed top-0 w-full bg-black border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10 backdrop-blur-sm">
        {/* Logo Circle - Small */}
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

        {/* Join Us Button */}
        <MagneticButton 
          className="border border-[#C42121] px-4 py-2 md:px-8 md:py-3 rounded-none text-[10px] md:text-xs font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase pointer-events-auto cursor-pointer"
          onClick={() => {
            window.scrollTo(0, 0);
            setTimeout(() => navigate('/form'), 50);
          }}
        >
          JOIN US
        </MagneticButton>
      </header>

      {/* Content Container */}
      <div className="relative z-10 opacity-100 pt-16 md:pt-20">

        {/* Hero Section */}
        <section className="relative min-h-[100svh] h-screen flex flex-col items-center justify-center overflow-hidden perspective-1000">
            {/* Spinning Circle - No hover effect */}
            <motion.div 
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ 
                  scale: hasLoaded ? 1 : 0.3,
                  opacity: hasLoaded ? 1 : 0
                }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.2
                }}
                style={{ 
                  rotate: rotation,
                  scale: circleScale,
                  x: '-50%',
                  y: 'calc(-50% - 5vh)',
                  willChange: 'transform'
                }}
                className="absolute top-1/2 left-1/2 w-[144vw] h-[144vw] md:w-[90vh] md:h-[90vh] flex items-center justify-center"
            >
                <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <defs>
                    <path id="circlePath" d="M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0" fill="none" />
                  </defs>
                  <text fill="#C42121" className="uppercase" style={{ fontSize: '52px', letterSpacing: '-0.16em' }}>
                    <textPath href="#circlePath" startOffset="0%" textAnchor="start">
                      <tspan style={{ fontWeight: 900 }}>THECIRCLE</tspan>
                      <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                      <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                    </textPath>
                  </text>
                </svg>
            </motion.div>

            {/* Central Text */}
            <div className="relative z-20 text-center mix-blend-exclusion pointer-events-none">
                {/* <h2 className="text-[10vw] md:text-[5vw] font-black tracking-[-0.08em] leading-[0.8]" style={{ color: '#8B1A1A' }}>
                    VOL. II
                </h2> */}
                {/* <p className="mt-4 font-mono text-xs md:text-sm tracking-[0.5em] opacity-80">
                    SILENCE WAS DEAFENING
                </p> */}
            </div>

            {/* Scroll Indicator */}
            {/* <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 mix-blend-exclusion">
                <div className="w-[1px] h-16 bg-[#C42121] origin-top animate-pulse" />
                <span className="font-mono text-[10px] tracking-widest">SCROLL TO BREACH</span>
            </div> */}
        </section>

        {/* Manifesto Section - Enhanced with Sequential Mysterious Reveals */}
        <section className="relative py-32 md:py-40 px-6 md:px-20 border-t border-[#C42121]/20 backdrop-blur-[2px]">
            <div className="max-w-6xl mx-auto">
                {/* Mobile: Description first, Desktop: Grid layout */}
                <div className="flex flex-col md:grid md:grid-cols-2 gap-12 md:gap-16">
                    {/* Left Column - Body Text */}
                    <ScrollReveal delay={0.1} variant="blur">
                        <div className="text-base md:text-lg leading-relaxed opacity-80 md:sticky md:top-32 h-fit space-y-6 transition-opacity duration-300">
                            <p>
                                The Circle is a nomadic creative space where electronic music, art, and live performances come together. Every event is ephemeral, immersive, and curated to create unique experiences.
                            </p>
                            <p>
                                Participants are selected to join a network of like-minded artists, creators, and art lovers. Here, ideas cross, disciplines mix, and collaboration drives every moment.
                            </p>
                            <p className="text-base md:text-lg font-light leading-relaxed pt-4 border-t border-[#C42121]/20 mt-8">
                                An underground event concept based in Valencia. A curated mix of bold talent and art-driven people.
                            </p>
                        </div>
                    </ScrollReveal>

                    {/* Right Column - Headers with Sequential Reveal */}
                    <div className="space-y-0">
                        {/* First Line - MUSIC THAT */}
                        <ScrollReveal delay={0.2} variant="blur">
                            <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tighter mb-4">
                                <span className="text-[#C42121]">MUSIC THAT MOVES UNSEEN<br/>SPACES.</span>
                            </h2>
                        </ScrollReveal>

                        {/* Second Line - MOMENTS THAT */}
                        <ScrollReveal delay={0.6} variant="glitch">
                            <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tighter mb-4">
                                <span className="text-[#330000] selection:bg-white selection:text-black">MOMENTS THAT HAPPEN ONLY<br/>ONCE.</span>
                            </h2>
                        </ScrollReveal>

                        {/* Third Line - EXPRESSION */}
                        <ScrollReveal delay={1.0} variant="blur">
                            <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tighter">
                                <span className="text-[#C42121]">EXPRESSION WITHOUT<br/>BOUNDARIES.</span>
                            </h2>
                        </ScrollReveal>
                    </div>
                </div>
            </div>
        </section>

        {/* Marquee Banner - Pauses on hover */}
        <div className="py-6 md:py-8 bg-[#C42121] text-black overflow-hidden border-y border-black group">
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
                    <span key={i} className="text-3xl md:text-5xl font-black uppercase tracking-tight transition-opacity duration-300 group-hover:opacity-80">
                        SECRET LOCATION • ELECTRONIC MUSIC • BOLD ART • PERFORMANCES •
                    </span>
                ))}
             </motion.div>
        </div>

        {/* Inner Circle Access Form - Enhanced */}
        <section className="relative min-h-screen flex items-center justify-center px-6 py-32 md:py-40">
            <ScrollReveal delay={0.1} className="w-full max-w-2xl">
                <div className="bg-black/90 border border-[#C42121]/30 p-8 md:p-20 backdrop-blur-xl shadow-[0_0_50px_rgba(196,33,33,0.1)]">
                    <div className="text-center mb-12">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                            className="w-16 h-16 border-2 border-[#C42121] rounded-full mx-auto mb-8"
                            style={{ willChange: 'transform' }}
                        />
                        <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">JOIN THE NEXT EVENT</h3>
                        <div className="text-sm tracking-wide text-[#C42121]/60 leading-relaxed space-y-4 transition-opacity duration-300">
                            <p>We review every submission carefully. If selected, you will receive the link to the event ticket.</p>
                            <p>Attendance is limited. Each night is designed to maintain a creative, intimate, and connected community.</p>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <MagneticButton 
                            className="group relative bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] active:animate-glitch transition-all duration-300 overflow-hidden pointer-events-auto cursor-pointer"
                            onClick={() => {
                              window.scrollTo(0, 0);
                              setTimeout(() => navigate('/form'), 50);
                            }}
                        >
                            <span className="relative z-10">
                                APPLY
                            </span>
                        </MagneticButton>
                    </div>
                </div>
            </ScrollReveal>
        </section>
      </div>


      {/* Footer - Only visible at bottom */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isAtBottom ? 1 : 0
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full p-6 md:p-8 z-40 text-[#C42121] mix-blend-exclusion"
      >
        {/* Desktop Layout */}
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

        {/* Mobile Layout */}
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

      <style>{`
        /* Glitch Animation */
        @keyframes glitch {
          0% { 
            transform: translate(0);
            filter: none;
          }
          20% { 
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg);
          }
          40% { 
            transform: translate(-2px, -2px);
            filter: invert(1);
          }
          60% { 
            transform: translate(2px, 2px);
            filter: hue-rotate(180deg);
          }
          80% { 
            transform: translate(2px, -2px);
            filter: invert(1) hue-rotate(270deg);
          }
          100% { 
            transform: translate(0);
            filter: none;
          }
        }
        .animate-glitch {
          animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* Ripple Effect */
        @keyframes ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 0.5;
            transform: translate(-50%, -50%);
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
            transform: translate(-50%, -50%);
          }
        }
        .animate-ripple {
          animation: ripple 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Performance: Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}