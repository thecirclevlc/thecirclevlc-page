import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { gsap } from 'gsap';
import { HamburgerMenu } from './HamburgerMenu';
import Footer from './components/Footer';
import { useSiteBlock } from './hooks/useSiteContent';
import AdminToolbar from './components/AdminToolbar';
import { supabase } from './lib/supabase';
import { FORM_SCHEMA_JOIN_KEY, type FormSchema, type FormFieldSchema } from './lib/database.types';
import { DEFAULT_FORM_SCHEMA } from './lib/formSchema';

// ── Smooth scroll utility ─────────────────────────────────────────
let scrollAnimationId: number | null = null;
let isScrolling = false;

const smoothScrollTo = (target: number, duration: number = 2250) => {
  if (scrollAnimationId !== null) cancelAnimationFrame(scrollAnimationId);
  const start = window.pageYOffset;
  const distance = target - start;
  const startTime = performance.now();
  isScrolling = true;
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const scroll = (currentTime: number) => {
    if (!isScrolling) { scrollAnimationId = null; return; }
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));
    if (progress < 1) scrollAnimationId = requestAnimationFrame(scroll);
    else { scrollAnimationId = null; isScrolling = false; }
  };
  scrollAnimationId = requestAnimationFrame(scroll);
  const cancel = () => {
    isScrolling = false;
    if (scrollAnimationId !== null) { cancelAnimationFrame(scrollAnimationId); scrollAnimationId = null; }
  };
  window.addEventListener('wheel', cancel, { passive: true, once: true });
  window.addEventListener('touchmove', cancel, { passive: true, once: true });
};

// ── WebGL Background (unchanged) ──────────────────────────────────
const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;
const fragmentShaderSource = `
  precision mediump float;
  uniform float uTime; uniform vec2 uMouse; uniform vec2 uResolution; uniform float uChaos;
  varying vec2 vUv;
  float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }
  float noise(vec2 st) {
    vec2 i = floor(st); vec2 f = fract(st);
    float a = random(i); float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  void main() {
    vec2 st = vUv; float aspect = uResolution.x / uResolution.y; st.x *= aspect;
    vec2 mouse = uMouse; mouse.x *= aspect;
    float dist = distance(st, mouse);
    float decay = clamp(1.0 - dist * 2.5, 0.0, 1.0);
    float ripple = sin(dist * 30.0 - uTime * 3.0) * 0.02 * decay;
    vec2 center = vec2(0.5 * aspect, 0.5);
    vec2 toCenter = center - st; float distToCenter = length(toCenter);
    vec2 suction = normalize(toCenter) * uChaos * 0.1 * sin(uTime * 10.0);
    float chaosNoise = (random(st * uTime) - 0.5) * uChaos * 0.1;
    vec2 distortedSt = vUv + ripple + suction + chaosNoise;
    float gridSize = 30.0; vec2 gridUV = distortedSt * gridSize;
    float thickness = 0.03 + (uChaos * 0.05);
    vec2 gridLine = smoothstep(0.5 - thickness, 0.5, fract(gridUV)) * smoothstep(0.5 + thickness, 0.5, fract(gridUV));
    float lines = max(gridLine.x, gridLine.y);
    float vignette = smoothstep(0.8, 0.2, distance(vUv, vec2(0.5)));
    vec3 black = vec3(0.05, 0.0, 0.02); vec3 red = vec3(0.77, 0.13, 0.13);
    float fog = noise(distortedSt * 3.0 + uTime * 0.2);
    vec3 color = mix(black, red * 0.3, fog);
    float gridIntensity = 0.05 + (uChaos * 0.8);
    color = mix(color, red, lines * gridIntensity * vignette);
    if (uChaos > 0.0) color *= smoothstep(0.0, 0.5, distToCenter + (1.0 - uChaos));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const WebGLBackground: React.FC<{ chaosLevel: number }> = ({ chaosLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const gl = canvas.getContext('webgl'); if (!gl) return;
    const createShader = (type: number, src: string) => {
      const sh = gl.createShader(type); if (!sh) return null;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { gl.deleteShader(sh); return null; }
      return sh;
    };
    const vs = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;
    const prog = gl.createProgram(); if (!prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const uRes = gl.getUniformLocation(prog, 'uResolution');
    const uChaos = gl.getUniformLocation(prog, 'uChaos');
    let mouse = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
    const start = performance.now(); let raf = 0;
    const onResize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const onMove = (e: MouseEvent) => { target.x = e.clientX; target.y = window.innerHeight - e.clientY; };
    window.addEventListener('resize', onResize); window.addEventListener('mousemove', onMove);
    onResize();
    const render = () => {
      const t = (performance.now() - start) * 0.001;
      mouse.x += (target.x - mouse.x) * 0.1; mouse.y += (target.y - mouse.y) * 0.1;
      gl.uniform1f(uTime, t); gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 6); raf = requestAnimationFrame(render);
    };
    render();
    (canvas as any).updateChaos = (v: number) => { gl.useProgram(prog); gl.uniform1f(uChaos, v); };
    return () => {
      window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf); gl.deleteProgram(prog);
    };
  }, []);
  useEffect(() => {
    if (canvasRef.current && (canvasRef.current as any).updateChaos) {
      (canvasRef.current as any).updateChaos(chaosLevel);
    }
  }, [chaosLevel]);
  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
};

// ── Animated Title (dynamic) ──────────────────────────────────────
const AnimatedTitle: React.FC<{ text: string; sending: boolean }> = ({ text, sending }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;
    const letters = titleRef.current.querySelectorAll('.letter');
    const onEnter = () => {
      gsap.to(letters, {
        y: -8, duration: 1.2, ease: 'power1.inOut',
        stagger: { each: 0.025, from: 'start', yoyo: true, repeat: 1 },
      });
      gsap.to(letters, {
        textShadow: '0 0 20px rgba(255, 68, 68, 0.6), 0 0 40px rgba(255, 68, 68, 0.3)',
        scale: 1.02, duration: 1, ease: 'power1.inOut',
        stagger: { each: 0.025, from: 'start' },
      });
    };
    const onLeave = () => {
      gsap.to(letters, {
        y: 0, textShadow: '0 0 0px rgba(255, 68, 68, 0)', scale: 1,
        duration: 1, ease: 'power1.out', stagger: { each: 0.015, from: 'start' },
      });
    };
    const el = titleRef.current;
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mouseenter', onEnter); el.removeEventListener('mouseleave', onLeave); };
  }, [text]);

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <motion.h1
      ref={titleRef}
      animate={sending ? { filter: ['blur(0px)', 'blur(0px)'], opacity: [1, 0.85, 1, 0.9, 1] } : {}}
      transition={sending ? { duration: 3.5, repeat: Infinity, ease: [0.45, 0.05, 0.55, 0.95], times: [0, 0.3, 0.5, 0.7, 1] } : {}}
      className="text-6xl md:text-9xl font-black mb-6 tracking-tighter leading-[0.8] cursor-pointer"
    >
      {words.map((word, wi) => (
        <React.Fragment key={`w-${wi}`}>
          {word.split('').map((char, ci) => (
            <span key={`w-${wi}-c-${ci}`} className="letter inline-block">{char}</span>
          ))}
          {wi < words.length - 1 && (wi === 0 ? <br /> : ' ')}
        </React.Fragment>
      ))}
    </motion.h1>
  );
};

// ── Dynamic Field ─────────────────────────────────────────────────
interface DynamicFieldProps {
  field: FormFieldSchema;
  value: string;
  onChange: (v: string) => void;
  error: boolean;
  index: number;
}

function DynamicField({ field, value, onChange, error, index }: DynamicFieldProps) {
  const inputClass =
    'w-full bg-transparent border-b border-[#C42121] py-4 text-[#f5f5f0] text-base md:text-2xl font-mono focus:outline-none focus:border-[#ff4444] transition-all placeholder:text-[#888] placeholder:text-base md:placeholder:text-xl';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={error
        ? { opacity: 1, x: 0, borderColor: ['#C42121', '#ff0000', '#C42121'] }
        : { opacity: 1, x: 0 }
      }
      transition={error
        ? { borderColor: { duration: 0.5, repeat: 3 }, delay: 0.4 + index * 0.05 }
        : { delay: 0.4 + index * 0.05 }
      }
      className="group"
    >
      <motion.label
        animate={error
          ? { opacity: [0.5, 1, 0.5], color: ['#C42121', '#ff0000', '#C42121'] }
          : { opacity: 1, color: '#f5f5f0' }
        }
        transition={error ? { duration: 0.5, repeat: 3 } : {}}
        className="block text-base font-mono tracking-[0.3em] mb-3 uppercase"
      >
        {field.label}
      </motion.label>
      {field.type === 'textarea' ? (
        <motion.textarea
          name={field.name}
          required={field.required}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={field.rows ?? 3}
          animate={error ? { borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333'] } : {}}
          transition={error ? { duration: 0.5, repeat: 3 } : {}}
          className={inputClass + ' resize-none'}
          placeholder={field.placeholder ?? ''}
        />
      ) : field.type === 'select' ? (
        <motion.select
          name={field.name}
          required={field.required}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">{field.placeholder ?? 'Select…'}</option>
          {(field.options ?? []).map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </motion.select>
      ) : (
        <motion.input
          type={field.type}
          name={field.name}
          required={field.required}
          value={value}
          onChange={e => onChange(e.target.value)}
          animate={error ? { borderColor: ['#333', '#C42121', '#ff0000', '#C42121', '#333'] } : {}}
          transition={error ? { duration: 0.5, repeat: 3 } : {}}
          className={inputClass}
          placeholder={field.placeholder ?? ''}
        />
      )}
    </motion.div>
  );
}

// ── Terms text renderer (supports {terms_link:Label} and {privacy_link:Label}) ──
function renderTermsText(html: string): React.ReactNode {
  // Pattern: {terms_link:Label} or {privacy_link:Label}
  const parts = html.split(/(\{(?:terms|privacy)_link:[^}]+\})/g);
  return parts.map((p, i) => {
    const m = p.match(/^\{(terms|privacy)_link:([^}]+)\}$/);
    if (m) {
      const [, kind, label] = m;
      const href = kind === 'terms' ? '/terms' : '/privacy';
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-[#C42121] hover:underline">
          {label}
        </a>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ── Main ──────────────────────────────────────────────────────────
export default function FormPage() {
  const navigate = useNavigate();
  const rotation = useMotionValue(0);
  const [chaosLevel, setChaosLevel] = useState(0);
  const { data: schema } = useSiteBlock<FormSchema>(FORM_SCHEMA_JOIN_KEY, DEFAULT_FORM_SCHEMA);

  // Initialize formData based on schema fields
  const [formData, setFormData] = useState<Record<string, string>>({});
  useEffect(() => {
    setFormData(prev => {
      const next: Record<string, string> = { ...prev };
      schema.fields.forEach(f => { if (!(f.name in next)) next[f.name] = ''; });
      return next;
    });
  }, [schema.fields]);

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showError, setShowError] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [showCaptchaError, setShowCaptchaError] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Logo rotation
  useEffect(() => {
    let lastTime = performance.now(); let raf = 0;
    const update = () => {
      const time = performance.now();
      const delta = (time - lastTime) / 1000; lastTime = time;
      rotation.set(rotation.get() + 0.98 * delta);
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [rotation]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const sortedFields = [...schema.fields].sort((a, b) => a.sort_order - b.sort_order);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const empty: string[] = sortedFields
      .filter(f => f.required && !(formData[f.name] ?? '').trim())
      .map(f => f.name);

    if (empty.length > 0) {
      setEmptyFields(empty);
      setShowError(true);
      setChaosLevel(0.3);
      setTimeout(() => {
        const first = document.querySelector(`[name="${empty[0]}"]`) as HTMLElement | null;
        if (first) {
          const pos = first.getBoundingClientRect().top + window.pageYOffset - 150;
          smoothScrollTo(pos, 1800);
        }
      }, 100);
      setTimeout(() => { setShowError(false); setChaosLevel(0); }, 2000);
      return;
    }

    if (schema.captcha_required && !captchaValue) {
      setShowCaptchaError(true); setChaosLevel(0.3);
      setTimeout(() => {
        const el = document.querySelector('.recaptcha-container') as HTMLElement | null;
        if (el) {
          const pos = el.getBoundingClientRect().top + window.pageYOffset - 150;
          smoothScrollTo(pos, 1800);
        }
      }, 100);
      setTimeout(() => { setShowCaptchaError(false); setChaosLevel(0); }, 2000);
      return;
    }

    setSending(true); setChaosLevel(0.2); setEmptyFields([]);
    smoothScrollTo(0, 2250);

    try {
      // Verify CAPTCHA in production
      if (schema.captcha_required && import.meta.env.PROD && captchaValue) {
        const v = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ captchaToken: captchaValue }),
        });
        const result = await v.json();
        if (!result.success) {
          setShowError(true); setShowCaptchaError(true);
          recaptchaRef.current?.reset(); setCaptchaValue(null);
          setTimeout(() => { setShowError(false); setShowCaptchaError(false); setChaosLevel(0); }, 2000);
          setSending(false);
          return;
        }
      }

      // Build submission payload from schema-defined fields
      const data: Record<string, string> = {};
      sortedFields.forEach(f => { data[f.name] = (formData[f.name] ?? '').trim(); });

      const { error } = await supabase.from('form_submissions').insert({
        form_key: FORM_SCHEMA_JOIN_KEY,
        data,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      setSubmitted(true);
      recaptchaRef.current?.reset();
    } catch (err) {
      console.error('Form submission failed:', err);
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      recaptchaRef.current?.reset(); setCaptchaValue(null);
    } finally {
      setSending(false); setChaosLevel(0);
    }
  };

  const handleCaptchaChange = (v: string | null) => { setCaptchaValue(v); setShowCaptchaError(false); };

  // ── Success view ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050000] text-[#C42121] flex items-center justify-center p-4 md:p-6 pt-24 md:pt-32 relative overflow-hidden cursor-crosshair">
        <WebGLBackground chaosLevel={0} />
        <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
          <motion.div style={{ rotate: rotation }} className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
            <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <defs><path id="circlePathSmallSubmit" d="M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0" fill="none" /></defs>
              <text fill="#C42121" className="uppercase" style={{ fontSize: '52px', letterSpacing: '-0.16em' }}>
                <textPath href="#circlePathSmallSubmit" startOffset="0%">
                  <tspan style={{ fontWeight: 900 }}>THECIRCLE</tspan>
                  <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                  <tspan style={{ fontWeight: 400 }}> THECIRCLE</tspan>
                </textPath>
              </text>
            </svg>
          </motion.div>
          <HamburgerMenu />
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="text-center max-w-4xl w-full relative z-10 px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1, 0.8], rotate: [0, 180, 360] }}
            transition={{ duration: 2, ease: 'easeInOut', times: [0, 0.3, 0.7, 1] }}
            className="mb-8 md:mb-12 flex justify-center"
          >
            <div className="relative w-24 h-24 md:w-32 md:h-32">
              <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, ease: 'linear' }, scale: { duration: 1, repeat: 1 } }} className="absolute inset-0 border-2 border-[#C42121] rounded-full opacity-60" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }} transition={{ duration: 1, repeat: 1 }} className="absolute inset-4 border border-[#C42121] rounded-full" />
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: 2 }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#C42121] rounded-full shadow-[0_0_20px_#C42121]" />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-16 md:mb-20 max-w-3xl mx-auto">
            <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-6 uppercase">
              {schema.success_title}
            </p>
            <p className="text-lg sm:text-xl md:text-2xl font-light tracking-tight leading-relaxed opacity-80">
              {schema.success_subtitle}
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.03, backgroundColor: '#C42121' }} whileTap={{ scale: 0.97 }}
            className="border border-[#C42121] px-10 py-3 text-xs tracking-[0.3em] transition-colors uppercase font-bold mix-blend-exclusion hover:text-black"
          >
            {schema.return_label}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black cursor-crosshair overflow-x-hidden">
      <WebGLBackground chaosLevel={chaosLevel} />

      <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
        <motion.div style={{ rotate: rotation }} className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center cursor-pointer" onClick={() => navigate('/')}>
          <svg viewBox="0 0 300 300" className="w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
            <defs><path id="circlePathSmall" d="M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0" fill="none" /></defs>
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

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6 pt-20 md:pt-32 pb-8 md:pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-16">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="w-2 h-2 bg-[#C42121] rounded-full mx-auto mb-10 shadow-[0_0_30px_#C42121]" />
            <AnimatedTitle text={schema.title} sending={sending} />
            <motion.div animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} className="w-48 h-[1px] bg-[#C42121] mx-auto my-8" />
            <motion.p animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} className="text-base tracking-[0.5em] uppercase font-mono text-[#f5f5f0]">
              {schema.subtitle}
            </motion.p>
          </div>

          {/* Event info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={sending ? { opacity: 0, filter: 'blur(8px)', scale: 0.95 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ delay: sending ? 0 : 0.3, duration: 0.5 }}
            className="mb-12 p-8 border border-[#C42121]/20 bg-black/60 backdrop-blur-sm"
          >
            <p className="text-base leading-relaxed text-center tracking-widest uppercase font-mono text-[#f5f5f0]">
              {schema.event_info}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-12"
            animate={sending ? { opacity: 0, filter: 'blur(12px)', scale: 0.98 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {sortedFields.map((field, idx) => (
              <DynamicField
                key={field.id}
                field={field}
                value={formData[field.name] ?? ''}
                onChange={v => handleChange(field.name, v)}
                error={emptyFields.includes(field.name)}
                index={idx}
              />
            ))}

            {/* Terms checkbox */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82 }} className="flex justify-center">
              <label className="flex items-start gap-3 cursor-pointer max-w-md">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#C42121] cursor-pointer shrink-0"
                />
                <span className="text-xs font-mono text-[#f5f5f0]/60 leading-relaxed">
                  {renderTermsText(schema.terms_text_html)}
                </span>
              </label>
            </motion.div>

            {/* CAPTCHA */}
            {schema.captcha_required && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
                className="flex flex-col items-center recaptcha-container"
              >
                <motion.div
                  animate={showCaptchaError ? { scale: [1, 1.05, 1, 1.05, 1], opacity: [1, 0.7, 1, 0.7, 1] } : {}}
                  transition={showCaptchaError ? { duration: 1.5, ease: 'easeInOut' } : {}}
                  className="transform scale-90 md:scale-100 origin-center"
                >
                  {import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      onChange={handleCaptchaChange}
                      theme="dark"
                    />
                  )}
                </motion.div>
                {showCaptchaError && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[#ff0000] text-sm font-mono mt-4 tracking-wider uppercase">
                    Please complete the security verification
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex justify-center pt-12">
              <motion.button
                type="submit"
                disabled={sending || !acceptedTerms}
                whileTap={{ scale: 0.95 }}
                animate={showError ? {
                  scale: [1, 1.05, 1, 1.05, 1],
                  backgroundColor: ['#C42121', '#ff0000', '#C42121', '#ff0000', '#C42121'],
                } : sending ? { scale: [1, 1.05, 1] } : {}}
                transition={showError ? { duration: 1.5, ease: 'easeInOut' } : sending ? { duration: 0.3 } : {}}
                className="group relative bg-[#C42121] font-black text-lg py-5 px-16 uppercase tracking-[0.3em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(196,33,33,0.6)] disabled:opacity-70"
              >
                <span className="relative z-10 text-black">
                  {showError ? schema.submit_label_error : sending ? schema.submit_label_sending : schema.submit_label_idle}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#C42121] via-[#ff3333] to-[#C42121] bg-[length:200%_100%] animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      <Footer />
      <AdminToolbar />

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x { animation: gradient-x 3s ease infinite; }
      `}</style>
    </div>
  );
}
