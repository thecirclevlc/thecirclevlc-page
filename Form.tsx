import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- WEBGL BACKGROUND (Same as main page) ---
const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

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

  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 st = vUv;
    float aspect = uResolution.x / uResolution.y;
    st.x *= aspect;
    
    vec2 mouse = uMouse;
    mouse.x *= aspect;

    float dist = distance(st, mouse);
    float decay = clamp(1.0 - dist * 2.5, 0.0, 1.0);
    float ripple = sin(dist * 30.0 - uTime * 3.0) * 0.02 * decay;
    
    vec2 center = vec2(0.5 * aspect, 0.5);
    vec2 toCenter = center - st;
    float distToCenter = length(toCenter);
    
    vec2 suction = normalize(toCenter) * uChaos * 0.1 * sin(uTime * 10.0);
    float chaosNoise = (random(st * uTime) - 0.5) * uChaos * 0.1;
    
    vec2 distortedSt = vUv + ripple + suction + chaosNoise;
    
    float gridSize = 30.0;
    vec2 gridUV = distortedSt * gridSize;
    
    float thickness = 0.03 + (uChaos * 0.05);
    vec2 gridLine = smoothstep(0.5 - thickness, 0.5, fract(gridUV)) * smoothstep(0.5 + thickness, 0.5, fract(gridUV));
    float lines = max(gridLine.x, gridLine.y);
    
    float vignette = smoothstep(0.8, 0.2, distance(vUv, vec2(0.5)));
    
    vec3 black = vec3(0.05, 0.0, 0.02);
    vec3 red = vec3(0.77, 0.13, 0.13);
    
    float fog = noise(distortedSt * 3.0 + uTime * 0.2);
    vec3 color = mix(black, red * 0.3, fog);
    
    float gridIntensity = 0.05 + (uChaos * 0.8); 
    color = mix(color, red, lines * gridIntensity * vignette);

    if (uChaos > 0.0) {
        color *= smoothstep(0.0, 0.5, distToCenter + (1.0 - uChaos));
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const WebGLBackground: React.FC<{ chaosLevel: number }> = ({ chaosLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

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

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

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
      targetMouse.y = window.innerHeight - e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    const render = () => {
      const time = (performance.now() - startTime) * 0.001;
      mouse.x += (targetMouse.x - mouse.x) * 0.1;
      mouse.y += (targetMouse.y - mouse.y) * 0.1;
      gl.uniform1f(uTimeLoc, time);
      gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(render);
    };
    render();

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

  useEffect(() => {
    if (canvasRef.current && (canvasRef.current as any).updateChaos) {
      (canvasRef.current as any).updateChaos(chaosLevel);
    }
  }, [chaosLevel]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
};

export default function FormPage() {
  const navigate = useNavigate();
  const [chaosLevel, setChaosLevel] = useState(0);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [formData, setFormData] = useState({
    fullName: '',
    ageLocation: '',
    instagram: '',
    unexpected: '',
    dreamGuest: '',
    expectations: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setChaosLevel(0.2); // Subtle chaos effect on submit
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
      console.log('Form submitted:', formData);
      setSubmitted(true);
      setSending(false);
      setChaosLevel(0);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050000] text-[#C42121] flex items-center justify-center p-6 relative overflow-hidden cursor-crosshair">
        <WebGLBackground chaosLevel={0} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center max-w-3xl relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.4 }}
            className="mb-12"
          >
            <div className="w-32 h-32 border-2 border-[#C42121] rounded-full mx-auto flex items-center justify-center relative">
              <motion.div 
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-4 h-4 bg-[#C42121] rounded-full shadow-[0_0_30px_#C42121]" 
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-[#C42121] rounded-full"
              />
            </div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-5xl md:text-8xl font-black mb-6 tracking-tighter leading-[0.85] mix-blend-exclusion"
          >
            SIGNAL<br/>RECEIVED
          </motion.h2>

          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="w-64 h-[1px] bg-[#C42121] mx-auto mb-8"
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="space-y-3 mb-10"
          >
            <p className="text-lg font-mono tracking-[0.3em] uppercase opacity-80">
              Your data has been encrypted
            </p>
            <p className="text-sm tracking-[0.2em] opacity-50 uppercase font-mono">
              We will contact you if selected
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="p-6 border border-[#C42121]/20 bg-black/60 backdrop-blur-sm mb-10"
          >
            <p className="text-xs font-mono leading-relaxed opacity-60 tracking-wider">
              PROTOCOL INITIATED / AWAIT FURTHER INSTRUCTIONS<br/>
              DO NOT SHARE THIS CONFIRMATION
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.03, backgroundColor: '#C42121' }}
            whileTap={{ scale: 0.97 }}
            className="border border-[#C42121] px-10 py-3 text-xs tracking-[0.3em] transition-colors uppercase font-bold mix-blend-exclusion"
          >
            RETURN
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black cursor-crosshair overflow-x-hidden">
      <WebGLBackground chaosLevel={chaosLevel} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full p-6 flex justify-between items-center z-50 mix-blend-difference">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-mono tracking-widest hover:opacity-70 transition-opacity uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK
        </button>
      </nav>

      {/* Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6 py-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-4xl"
        >
          {/* Title Section */}
          <div className="text-center mb-16">
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-2 h-2 bg-[#C42121] rounded-full mx-auto mb-10 shadow-[0_0_30px_#C42121]" 
            />
            <motion.h1 
              animate={sending ? { 
                filter: ['blur(0px)', 'blur(0px)'],
                opacity: [1, 0.85, 1, 0.9, 1]
              } : {}}
              transition={sending ? { 
                duration: 3.5,
                repeat: Infinity,
                ease: [0.45, 0.05, 0.55, 0.95],
                times: [0, 0.3, 0.5, 0.7, 1]
              } : {}}
              className="text-6xl md:text-9xl font-black mb-6 tracking-tighter leading-[0.8] mix-blend-exclusion"
            >
              JOIN<br/>THE CIRCLE
            </motion.h1>
            <motion.div 
              animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 0.5, filter: 'blur(0px)' }}
              transition={{ duration: 0.5 }}
              className="w-48 h-[1px] bg-[#C42121] mx-auto my-8" 
            />
            <motion.p 
              animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 0.4, filter: 'blur(0px)' }}
              transition={{ duration: 0.5 }}
              className="text-xs tracking-[0.5em] uppercase"
            >
              VOL. II
            </motion.p>
          </div>

          {/* Protocol Box */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={sending ? { 
              opacity: 0, 
              filter: 'blur(8px)',
              scale: 0.95
            } : { 
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1
            }}
            transition={{ delay: sending ? 0 : 0.3, duration: 0.5 }}
            className="mb-12 p-8 border border-[#C42121]/20 bg-black/60 backdrop-blur-sm"
          >
            <p className="text-[10px] leading-relaxed opacity-60 text-center tracking-widest uppercase">
              10.01.2026 - SECRET LOCATION, VALENCIA
            </p>
          </motion.div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-12"
            animate={sending ? { 
              opacity: 0, 
              filter: 'blur(12px)',
              scale: 0.98
            } : { 
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Full Name */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm"
                placeholder="Your complete name"
              />
            </motion.div>

            {/* Age & Location */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                Your age & where are you from?
              </label>
              <input
                type="text"
                name="ageLocation"
                required
                value={formData.ageLocation}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm"
                placeholder="e.g., 28, Valencia"
              />
            </motion.div>

            {/* Instagram */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                Your Instagram Account
              </label>
              <input
                type="text"
                name="instagram"
                required
                value={formData.instagram}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm"
                placeholder="@username"
              />
            </motion.div>

            {/* Unexpected */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                What's something people would never expect about you?
              </label>
              <textarea
                name="unexpected"
                required
                value={formData.unexpected}
                onChange={handleChange}
                rows={3}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* Dream Guest */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                Imagine The Circle could bring anyone to the table, who would you want to sit with?
              </label>
              <textarea
                name="dreamGuest"
                required
                value={formData.dreamGuest}
                onChange={handleChange}
                rows={3}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* Expectations */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
              className="group"
            >
              <label className="block text-[10px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                What do you expect from The Circle?
              </label>
              <textarea
                name="expectations"
                required
                value={formData.expectations}
                onChange={handleChange}
                rows={3}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-lg font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-sm resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* Submit Button with Gradient Animation */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex justify-center pt-12"
            >
              <motion.button
                type="submit"
                disabled={sending}
                whileTap={{ scale: 0.95 }}
                animate={sending ? { scale: [1, 1.05, 1] } : {}}
                transition={sending ? { duration: 0.3 } : {}}
                className="group relative bg-[#C42121] font-black text-lg py-5 px-16 uppercase tracking-[0.3em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(196,33,33,0.6)] disabled:opacity-70"
              >
                <span className="relative z-10 text-black">
                  {sending ? 'SENT :)' : 'DONE'}
                </span>
                {/* Animated Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#C42121] via-[#ff3333] to-[#C42121] bg-[length:200%_100%] animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full p-6 flex justify-between items-end z-40 pointer-events-none mix-blend-difference opacity-40">
        <div className="text-[9px] tracking-widest uppercase">
          © 2025 THECIRCLE
        </div>
        <div className="text-[9px] tracking-widest uppercase">
          <a href="mailto:contact@thecirclevlc.com" className="pointer-events-auto hover:opacity-100 transition-opacity">
            contact@thecirclevlc.com
          </a>
        </div>
      </footer>

      {/* Custom Styles */}
      <style>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

