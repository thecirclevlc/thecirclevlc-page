import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

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

// Magnetic Button Component
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

export default function FormPage() {
  const navigate = useNavigate();
  const rotation = useMotionValue(0);
  const [chaosLevel, setChaosLevel] = useState(0);
  
  // Rotation animation
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

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    whereFrom: '',
    instagram: '',
    email: '',
    artist: '',
    unexpected: '',
    dreamGuest: '',
    expectations: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showError, setShowError] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [showCaptchaError, setShowCaptchaError] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields (all except artist)
    const requiredFields = {
      fullName: 'Full Name',
      age: 'Age',
      whereFrom: 'Where are you from',
      instagram: 'IG account',
      email: 'E-mail address',
      unexpected: "What's something people would never expect about you?",
      dreamGuest: 'Imagine The Circle could bring anyone to the table, who would you want to sit with?',
      expectations: 'What do you expect from The Circle?'
    };

    const empty: string[] = [];
    Object.entries(requiredFields).forEach(([key, label]) => {
      if (!formData[key as keyof typeof formData].trim()) {
        empty.push(key);
      }
    });

    if (empty.length > 0) {
      setEmptyFields(empty);
      setShowError(true);
      setChaosLevel(0.3);
      
      // Scroll to first empty field with extra smooth animation
      setTimeout(() => {
        const firstEmptyField = document.querySelector(`[name="${empty[0]}"]`) as HTMLElement;
        if (firstEmptyField) {
          const fieldPosition = firstEmptyField.getBoundingClientRect().top + window.pageYOffset - 150;
          smoothScrollTo(fieldPosition, 1800);
        }
      }, 100);

      // Reset error state after animation
      setTimeout(() => {
        setShowError(false);
        setChaosLevel(0);
      }, 2000);
      
      return;
    }

    // Validate CAPTCHA
    if (!captchaValue) {
      setShowCaptchaError(true);
      setChaosLevel(0.3);
      
      // Scroll to captcha
      setTimeout(() => {
        const captchaElement = document.querySelector('.recaptcha-container') as HTMLElement;
        if (captchaElement) {
          const captchaPosition = captchaElement.getBoundingClientRect().top + window.pageYOffset - 150;
          smoothScrollTo(captchaPosition, 1800);
        }
      }, 100);

      setTimeout(() => {
        setShowCaptchaError(false);
        setChaosLevel(0);
      }, 2000);
      
      return;
    }

    setSending(true);
    setChaosLevel(0.2);
    setEmptyFields([]);
    
    // Scroll to top with extra smooth animation
    smoothScrollTo(0, 2250);
    
    try {
      // Step 1: Verify CAPTCHA with our server (only in production)
      const isProduction = import.meta.env.PROD;
      
      if (isProduction) {
        const captchaVerification = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ captchaToken: captchaValue }),
        });

        const captchaResult = await captchaVerification.json();

        if (!captchaResult.success) {
          console.error('Captcha verification failed:', captchaResult.error);
          setShowError(true);
          setShowCaptchaError(true);
          
          // Reset captcha
          if (recaptchaRef.current) {
            recaptchaRef.current.reset();
          }
          setCaptchaValue(null);
          
          setTimeout(() => {
            setShowError(false);
            setShowCaptchaError(false);
            setChaosLevel(0);
          }, 2000);
          
          setSending(false);
          return;
        }
      } else {
        // In development, just log that we would verify
        console.log('🔧 Development mode: Skipping server-side CAPTCHA verification');
        console.log('✅ In production, the CAPTCHA will be verified server-side');
      }

      // Step 2: CAPTCHA verified, now submit form data
      const formDataToSend = new FormData();
      formDataToSend.append("data[Full name ]", formData.fullName.trim());
      formDataToSend.append("data[Age]", formData.age.trim());
      formDataToSend.append("data[Where are you from]", formData.whereFrom.trim());
      formDataToSend.append("data[IG account]", formData.instagram.trim());
      formDataToSend.append("data[E-mail address]", formData.email.trim());
      formDataToSend.append("data[Are you an artist? If so, please include the link to your portfolio]", formData.artist.trim());
      formDataToSend.append("data[What's something people would never expect about you?]", formData.unexpected.trim());
      formDataToSend.append("data[Imagine The Circle could bring anyone to the table, who would you want to sit with?]", formData.dreamGuest.trim());
      formDataToSend.append("data[What do you expect from The Circle?]", formData.expectations.trim());

      const response = await fetch('https://sheetdb.io/api/v1/ckttnw3xza586', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        console.log('Form submitted successfully:', formData);
        setSubmitted(true);
        // Reset captcha
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
      } else {
        console.error('Error submitting form:', response.statusText);
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        // Reset captcha on error
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setCaptchaValue(null);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      // Reset captcha on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaValue(null);
    } finally {
      setSending(false);
      setChaosLevel(0);
    }
  };

  const handleCaptchaChange = (value: string | null) => {
    setCaptchaValue(value);
    setShowCaptchaError(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050000] text-[#C42121] flex items-center justify-center p-4 md:p-6 pt-24 md:pt-32 relative overflow-hidden cursor-crosshair">
        <WebGLBackground chaosLevel={0} />
        
        {/* Sticky Header Bar */}
        <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
          {/* Logo Circle - Small */}
          <motion.div 
            style={{ rotate: rotation }}
            className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer"
            onClick={() => navigate('/')}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <defs>
                <path id="circlePathSmallSubmit" d="M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0" fill="none" />
              </defs>
              <text fill="#C42121" className="uppercase" style={{ fontSize: '52px', letterSpacing: '-0.16em' }}>
                <textPath href="#circlePathSmallSubmit" startOffset="0%">
                  <tspan style={{ fontWeight: 900 }}>THECIRCLE</tspan>
                  <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                  <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                </textPath>
              </text>
            </svg>
          </motion.div>

          {/* Back Button */}
          <MagneticButton 
            className="border border-[#C42121] px-4 py-2 md:px-6 md:py-3 rounded-none text-xs font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-colors uppercase pointer-events-auto cursor-pointer"
            onClick={() => navigate('/')}
          >
            BACK
          </MagneticButton>
        </header>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center max-w-4xl w-full relative z-10 px-4"
        >
          {/* Abstract Circle Animation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 0.8],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 2,
              ease: "easeInOut",
              times: [0, 0.3, 0.7, 1]
            }}
            className="mb-8 md:mb-12 flex justify-center"
          >
            <div className="relative w-24 h-24 md:w-32 md:h-32">
              {/* Outer ring */}
              <motion.div 
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 2, ease: "linear" },
                  scale: { duration: 1, repeat: 1 }
                }}
                className="absolute inset-0 border-2 border-[#C42121] rounded-full opacity-60"
              />
              
              {/* Inner circles */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.8, 0.3, 0.8]
                }}
                transition={{ duration: 1, repeat: 1 }}
                className="absolute inset-4 border border-[#C42121] rounded-full"
              />
              
              {/* Center dot */}
              <motion.div 
                animate={{ 
                  scale: [1, 1.3, 1],
                }}
                transition={{ duration: 0.8, repeat: 2 }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#C42121] rounded-full shadow-[0_0_20px_#C42121]" 
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16 md:mb-20 max-w-3xl mx-auto"
          >
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6 uppercase">
              WE HAVE RECEIVED YOUR INFORMATION.
            </p>
            <p className="text-lg sm:text-xl md:text-2xl font-light tracking-tight leading-relaxed opacity-80">
              If your vibe matches the spirit of the event, we will reach out with more details!
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.03, backgroundColor: '#C42121' }}
            whileTap={{ scale: 0.97 }}
            className="border border-[#C42121] px-10 py-3 text-xs tracking-[0.3em] transition-colors uppercase font-bold mix-blend-exclusion hover:text-black"
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

      {/* Sticky Header Bar */}
      <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
        {/* Logo Circle - Small */}
        <motion.div 
          style={{ rotate: rotation }}
          className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer"
          onClick={() => navigate('/')}
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

          {/* Back Button */}
          <MagneticButton 
            className="border border-[#C42121] px-4 py-2 md:px-6 md:py-3 rounded-none text-xs font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-colors uppercase pointer-events-auto cursor-pointer"
            onClick={() => navigate('/')}
          >
            BACK
          </MagneticButton>
        </header>

      {/* Form Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6 pt-24 md:pt-32 pb-20">
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
              className="text-xs tracking-[0.5em] uppercase font-mono"
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
            <p className="text-xs leading-relaxed opacity-60 text-center tracking-widest uppercase font-mono">
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
              animate={emptyFields.includes('fullName') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('fullName') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.4
              } : { delay: 0.4 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('fullName') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('fullName') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                Full Name
              </motion.label>
              <motion.input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                animate={emptyFields.includes('fullName') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('fullName') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="Your complete name"
              />
            </motion.div>

            {/* Age */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('age') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('age') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.5
              } : { delay: 0.5 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('age') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('age') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                Age
              </motion.label>
              <motion.input
                type="text"
                name="age"
                required
                value={formData.age}
                onChange={handleChange}
                animate={emptyFields.includes('age') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('age') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="Your age"
              />
            </motion.div>

            {/* Where are you from */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('whereFrom') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('whereFrom') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.55
              } : { delay: 0.55 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('whereFrom') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('whereFrom') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                Where are you from
              </motion.label>
              <motion.input
                type="text"
                name="whereFrom"
                required
                value={formData.whereFrom}
                onChange={handleChange}
                animate={emptyFields.includes('whereFrom') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('whereFrom') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="e.g., Valencia"
              />
            </motion.div>

            {/* Instagram */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('instagram') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('instagram') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.6
              } : { delay: 0.6 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('instagram') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('instagram') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                IG account
              </motion.label>
              <motion.input
                type="text"
                name="instagram"
                required
                value={formData.instagram}
                onChange={handleChange}
                animate={emptyFields.includes('instagram') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('instagram') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="@username"
              />
            </motion.div>

            {/* Email */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('email') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('email') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.65
              } : { delay: 0.65 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('email') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('email') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                E-mail address
              </motion.label>
              <motion.input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                animate={emptyFields.includes('email') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('email') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="your@email.com"
              />
            </motion.div>

            {/* Artist Portfolio */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="group"
            >
              <label className="block text-[13px] font-mono tracking-[0.3em] mb-3 opacity-50 uppercase">
                Are you an artist? If so, please include the link to your portfolio (optional)
              </label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg"
                placeholder="Portfolio link (optional)"
              />
            </motion.div>

            {/* Unexpected */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('unexpected') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('unexpected') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.75
              } : { delay: 0.75 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('unexpected') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('unexpected') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                What's something people would never expect about you?
              </motion.label>
              <motion.textarea
                name="unexpected"
                required
                value={formData.unexpected}
                onChange={handleChange}
                rows={3}
                animate={emptyFields.includes('unexpected') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('unexpected') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* Dream Guest */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('dreamGuest') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('dreamGuest') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.8
              } : { delay: 0.8 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('dreamGuest') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('dreamGuest') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                Imagine The Circle could bring anyone to the table, who would you want to sit with?
              </motion.label>
              <motion.textarea
                name="dreamGuest"
                required
                value={formData.dreamGuest}
                onChange={handleChange}
                rows={3}
                animate={emptyFields.includes('dreamGuest') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('dreamGuest') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* Expectations */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={emptyFields.includes('expectations') ? {
                opacity: 1,
                x: 0,
                borderColor: ['#C42121', '#ff0000', '#C42121']
              } : {
                opacity: 1,
                x: 0
              }}
              transition={emptyFields.includes('expectations') ? {
                borderColor: { duration: 0.5, repeat: 3 },
                delay: 0.85
              } : { delay: 0.85 }}
              className="group"
            >
              <motion.label 
                animate={emptyFields.includes('expectations') ? {
                  opacity: [0.5, 1, 0.5],
                  color: ['#C42121', '#ff0000', '#C42121']
                } : { opacity: 0.5 }}
                transition={emptyFields.includes('expectations') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="block text-[13px] font-mono tracking-[0.3em] mb-3 uppercase"
              >
                What do you expect from The Circle?
              </motion.label>
              <motion.textarea
                name="expectations"
                required
                value={formData.expectations}
                onChange={handleChange}
                rows={3}
                animate={emptyFields.includes('expectations') ? {
                  borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333']
                } : {}}
                transition={emptyFields.includes('expectations') ? {
                  duration: 0.5,
                  repeat: 3
                } : {}}
                className="w-full bg-transparent border-b border-[#333] py-4 text-[#C42121] text-2xl font-mono focus:outline-none focus:border-[#C42121] transition-all placeholder:text-[#333] placeholder:text-lg resize-none"
                placeholder="Your answer"
              />
            </motion.div>

            {/* CAPTCHA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              className="flex flex-col items-center recaptcha-container"
            >
              <motion.div
                animate={showCaptchaError ? {
                  scale: [1, 1.05, 1, 1.05, 1],
                  opacity: [1, 0.7, 1, 0.7, 1]
                } : {}}
                transition={showCaptchaError ? {
                  duration: 1.5,
                  ease: "easeInOut"
                } : {}}
                className="transform scale-90 md:scale-100 origin-center"
              >
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                  onChange={handleCaptchaChange}
                  theme="dark"
                />
              </motion.div>
              {showCaptchaError && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#ff0000] text-sm font-mono mt-4 tracking-wider uppercase"
                >
                  Please complete the security verification
                </motion.p>
              )}
            </motion.div>

            {/* Submit Button with Gradient Animation */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex justify-center pt-12"
            >
              <motion.button
                type="submit"
                disabled={sending}
                whileTap={{ scale: 0.95 }}
                animate={showError ? { 
                  scale: [1, 1.05, 1, 1.05, 1],
                  backgroundColor: ['#C42121', '#ff0000', '#C42121', '#ff0000', '#C42121']
                } : sending ? { 
                  scale: [1, 1.05, 1] 
                } : {}}
                transition={showError ? { 
                  duration: 1.5,
                  ease: "easeInOut"
                } : sending ? { 
                  duration: 0.3 
                } : {}}
                className="group relative bg-[#C42121] font-black text-lg py-5 px-16 uppercase tracking-[0.3em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(196,33,33,0.6)] disabled:opacity-70"
              >
                <span className="relative z-10 text-black">
                  {showError ? 'ERROR' : sending ? 'SENT :)' : 'DONE'}
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

