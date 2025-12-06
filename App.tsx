import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useScroll, useTransform, useVelocity, useSpring } from 'framer-motion';
// Icons no longer needed
import { useNavigate } from 'react-router-dom';

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

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
};

// 2. Magnetic Button Component
const MagneticButton: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  type?: "button" | "submit"; 
  disabled?: boolean;
  onClick?: () => void;
}> = ({ children, className, type = "button", disabled, onClick }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = (clientX - (left + width / 2)) * 0.3; // Strength of attraction
        const y = (clientY - (top + height / 2)) * 0.3;
        setPosition({ x, y });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.button
            ref={ref}
            type={type}
            disabled={disabled}
            className={className}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
        >
            {children}
        </motion.button>
    );
};

// --- Main App ---
export default function TheCircleApp() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const rotation = useMotionValue(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  
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
      <WebGLBackground chaosLevel={0} />
      
      {/* Noise Overlay (CSS) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 md:p-10 flex justify-between items-center z-50 mix-blend-exclusion opacity-100">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#C42121] rounded-full animate-pulse shadow-[0_0_10px_#C42121]" />
          <span className="text-[10px] md:text-xs font-mono tracking-[0.2em] font-bold">Valencia</span>
        </div>
        {/* <div className="hidden md:block text-[10px] font-mono tracking-[0.2em]">
            SYSTEM STATUS: {status === 'idle' ? 'OPERATIONAL' : 'CRITICAL FAILURE'}
        </div> */}
        <MagneticButton 
          className="border border-[#C42121] px-6 py-2 rounded-none text-[10px] font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-colors uppercase pointer-events-auto cursor-pointer"
          onClick={() => {
            window.scrollTo(0, 0);
            navigate('/form');
          }}
        >
          JOIN US
        </MagneticButton>
      </nav>

      {/* Content Container */}
      <div className="relative z-10 opacity-100">

        {/* Hero Section */}
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden perspective-1000">
            {/* Spinning Circle - Reduced 20% in responsive */}
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
                  scale: circleScale
                }}
                className="absolute w-[144vw] h-[144vw] md:w-[90vh] md:h-[90vh] flex items-center justify-center"
            >
                <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <defs>
                    <path id="circlePath" d="M 150, 150 m -100, 0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0" fill="none" />
                  </defs>
                  {/* First THECIRCLE - BOLD */}
                  <text fill="#C42121" className="uppercase" style={{ fontSize: '42px', fontWeight: 900, letterSpacing: '-0.06em' }}>
                    <textPath href="#circlePath" startOffset="0%">
                      THECIRCLE
                    </textPath>
                  </text>
                  {/* Second THECIRCLE - Normal */}
                  <text fill="#C42121" className="uppercase" style={{ fontSize: '42px', fontWeight: 400, letterSpacing: '-0.06em' }}>
                    <textPath href="#circlePath" startOffset="33.33%">
                      THECIRCLE
                    </textPath>
                  </text>
                  {/* Third THECIRCLE - Normal */}
                  <text fill="#C42121" className="uppercase" style={{ fontSize: '42px', fontWeight: 400, letterSpacing: '-0.06em' }}>
                    <textPath href="#circlePath" startOffset="66.66%">
                      THECIRCLE
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

        {/* Manifesto Section */}
        <section className="relative py-32 px-6 md:px-20 border-t border-[#C42121]/20 backdrop-blur-[2px]">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="text-sm leading-relaxed opacity-80 sticky top-32 h-fit space-y-6">
                    <p>
                        The Circle is a nomadic creative space where electronic music, art, and live performances come together. Every event is ephemeral, immersive, and curated to create unique experiences.
                    </p>
                    <p>
                        Participants are selected to join a network of like-minded artists, creators, and art lovers. Here, ideas cross, disciplines mix, and collaboration drives every moment.
                    </p>
                </div>
                <div>
                    <h2 className="text-4xl md:text-7xl font-bold leading-[0.9] tracking-tighter mb-12">
                        <span className="text-[#C42121]">MUSIC THAT MOVES UNSEEN<br/>SPACES.</span><br/>
                        <span className="text-[#330000] selection:bg-white selection:text-black">MOMENTS THAT HAPPEN ONLY<br/>ONCE.</span><br/>
                        <span className="text-[#C42121]">EXPRESSION WITHOUT<br/>BOUNDARIES.</span>
                    </h2>
                    <div className="text-lg md:text-xl font-light leading-relaxed max-w-lg">
                        <p>
                            An underground event concept based in Valencia. A curated mix of bold talent and art-driven people.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* Marquee Banner Top */}
        <div className="py-4 bg-[#C42121] text-black overflow-hidden border-y border-black">
             <motion.div 
                className="whitespace-nowrap flex gap-8"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
             >
                {[...Array(12)].map((_, i) => (
                    <span key={i} className="text-3xl md:text-5xl font-black uppercase tracking-tight">
                        TOTAL SILENCE • SECRET LOCATION • JOIN US • TOTAL SILENCE • ELECTRONIC MUSIC • BOLD ART • PERFORMANCES •
                    </span>
                ))}
             </motion.div>
        </div>

        {/* Inner Circle Access Form */}
        <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
            <div className="w-full max-w-2xl relative">
                <div className="bg-black/90 border border-[#C42121]/30 p-8 md:p-20 backdrop-blur-xl shadow-[0_0_50px_rgba(196,33,33,0.1)]">
                    <div className="text-center mb-12">
                        <div className="w-16 h-16 border-2 border-[#C42121] rounded-full mx-auto mb-6" />
                        <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">JOIN THE NEXT EVENT</h3>
                        <div className="text-xs tracking-wider text-[#C42121]/60 leading-relaxed space-y-4">
                            <p>We review every submission carefully. If selected, you will receive the link to the event ticket.</p>
                            <p>Attendance is limited. Each night is designed to maintain a creative, intimate, and connected community.</p>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <MagneticButton 
                            className="group relative bg-[#C42121] text-black font-black text-2xl md:text-3xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] active:animate-glitch transition-colors overflow-hidden pointer-events-auto cursor-pointer"
                            onClick={() => {
                              window.scrollTo(0, 0);
                              navigate('/form');
                            }}
                        >
                            <span className="relative z-10">
                                APPLY
                            </span>
                        </MagneticButton>
                    </div>
                </div>
            </div>
        </section>
      </div>


      {/* Footer */}
      <footer className="fixed bottom-0 w-full p-6 flex justify-between items-end z-40 pointer-events-none text-[#C42121] mix-blend-exclusion opacity-50">
        <div className="font-mono text-[10px] md:text-xs">
          <div>© 2025 THECIRCLE</div>
        </div>
        <div className="text-right font-mono text-[10px] md:text-xs flex flex-col gap-1">
          <div className="pointer-events-auto">
            <a href="mailto:contact@thecirclevlc.com" className="hover:opacity-100 transition-opacity">
              contact@thecirclevlc.com
            </a>
          </div>
        </div>
      </footer>

      <style>{`
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
      `}</style>
    </div>
  );
}