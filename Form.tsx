import { usePageTitle } from './hooks/usePageTitle';
import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { gsap } from 'gsap';
import Footer from './components/Footer';
import { useSiteBlock } from './hooks/useSiteContent';
import AdminToolbar from './components/AdminToolbar';
import { supabase } from './lib/supabase';
import {
  DEFAULT_FORM_SLUG, formKeyForSlug, isFieldBlank,
  type FormSchema, type FormFieldSchema,
} from './lib/database.types';
import { DEFAULT_FORM_SCHEMA } from './lib/formSchema';
import NotFound from './NotFound';
import { brandColor, fgColor, hexToRgb01 } from './lib/cssVar';
import { StandardHeader } from './StandardHeader';
import { SITE_THEME_KEY, DEFAULT_BACKGROUND, type SiteTheme, type SiteBackground } from './hooks/useSiteTheme';

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
  uniform float uTime; uniform vec2 uMouse; uniform vec2 uResolution; uniform float uChaos; uniform vec3 uBrand; uniform vec4 uBg;
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
    float ripple = sin(dist * 30.0 - uTime * uBg.z * 0.6) * 0.02 * decay;
    vec2 center = vec2(0.5 * aspect, 0.5);
    vec2 toCenter = center - st; float distToCenter = length(toCenter);
    vec2 suction = normalize(toCenter) * uChaos * 0.1 * sin(uTime * 10.0);
    float chaosNoise = (random(st * uTime) - 0.5) * uChaos * 0.1;
    vec2 distortedSt = vUv + ripple + suction + chaosNoise;
    float gridSize = uBg.x * 0.75; vec2 gridUV = distortedSt * gridSize;
    float thickness = uBg.y * 1.5 + (uChaos * 0.05);
    vec2 gridLine = smoothstep(0.5 - thickness, 0.5, fract(gridUV)) * smoothstep(0.5 + thickness, 0.5, fract(gridUV));
    float lines = max(gridLine.x, gridLine.y);
    float vignette = smoothstep(0.8, 0.2, distance(vUv, vec2(0.5)));
    vec3 black = vec3(0.05, 0.0, 0.02); vec3 red = uBrand;
    float fog = noise(distortedSt * 3.0 + uTime * 0.2);
    vec3 color = mix(black, red * 0.3, fog);
    float gridIntensity = uBg.w * 0.25 + (uChaos * 0.8);
    color = mix(color, red, lines * gridIntensity * vignette);
    if (uChaos > 0.0) color *= smoothstep(0.0, 0.5, distToCenter + (1.0 - uChaos));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const WebGLBackground: React.FC<{ chaosLevel: number; bg: SiteBackground }> = ({ chaosLevel, bg }) => {
  // Read inside the render loop rather than captured by the setup effect,
  // whose deps are [] — the sliders were written once, before the theme row
  // had even arrived, and never again.
  const bgRef = useRef(bg);
  bgRef.current = bg;
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
    gl.uniform3f(gl.getUniformLocation(prog, 'uBrand'), ...hexToRgb01(brandColor()));
    const uBg = gl.getUniformLocation(prog, 'uBg');
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
      const b = bgRef.current;
      gl.uniform4f(uBg, b.density, b.weight, b.speed, b.intensity);
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
  // 'Plain background' has to actually stop painting. Returning null also
  // tears down the WebGL context and its 60fps loop — the setting saves
  // battery, which is half of why someone picks it.
  if (bg.style === 'none') return null;

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
    'w-full bg-transparent border-b border-primary py-4 text-fg text-base md:text-2xl font-mono focus:outline-none focus:border-primary transition-all placeholder:text-[#888] placeholder:text-base md:placeholder:text-xl';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={error
        ? { opacity: 1, x: 0, borderColor: [brandColor(), '#ff0000', brandColor()] }
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
          ? { opacity: [0.5, 1, 0.5], color: [brandColor(), '#ff0000', brandColor()] }
          : { opacity: 1, color: fgColor() }
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
          animate={error ? { borderColor: ['#333', brandColor(), '#ff0000', brandColor(), '#333'] } : {}}
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
      ) : field.type === 'checkbox' ? (
        // Yes/no consent — the "acepto recibir correos" the client asked for.
        // Stored as the string 'yes'/'no' so the submission stays a flat
        // Record<string,string> and the CSV export needs no special case.
        <label className="flex items-start gap-3 cursor-pointer group/cb py-2">
          <input
            type="checkbox"
            name={field.name}
            checked={value === 'yes'}
            onChange={e => onChange(e.target.checked ? 'yes' : 'no')}
            className="mt-1 w-5 h-5 flex-shrink-0 accent-primary cursor-pointer"
          />
          <span className="text-fg/80 text-sm md:text-base font-mono leading-relaxed group-hover/cb:text-fg transition-colors">
            {field.placeholder || 'Yes'}
          </span>
        </label>
      ) : field.type === 'radio' ? (
        <div role="radiogroup" aria-label={field.label} className="space-y-2 py-2">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group/rd">
              <input
                type="radio"
                name={field.name}
                value={opt}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="w-5 h-5 flex-shrink-0 accent-primary cursor-pointer"
              />
              <span className="text-fg/80 text-sm md:text-base font-mono group-hover/rd:text-fg transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <motion.input
          type={field.type}
          name={field.name}
          required={field.required}
          value={value}
          onChange={e => onChange(e.target.value)}
          animate={error ? { borderColor: ['#333', brandColor(), '#ff0000', brandColor(), '#333'] } : {}}
          transition={error ? { duration: 0.5, repeat: 3 } : {}}
          className={inputClass}
          placeholder={field.placeholder ?? ''}
        />
      )}

      {field.help_text && (
        <p className="mt-2 text-xs font-mono text-fg/40 leading-relaxed">{field.help_text}</p>
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
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
  // `/form` → the default form; `/form/:slug` → any form the client created.
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const slug    = routeSlug ?? DEFAULT_FORM_SLUG;
  const formKey = formKeyForSlug(slug);

  const rotation = useMotionValue(0);
  const { data: theme } = useSiteBlock<SiteTheme>(SITE_THEME_KEY, {
    primary_color: '#C42121', bg_color: '#050000', font: 'poppins',
    type_scale: 1, background: DEFAULT_BACKGROUND,
  });
  const background = theme.background ?? DEFAULT_BACKGROUND;
  const [chaosLevel, setChaosLevel] = useState(0);
  const { data: schema, loading: schemaLoading, exists: formExists } =
    useSiteBlock<FormSchema>(formKey, DEFAULT_FORM_SCHEMA);

  usePageTitle(schema.name || 'Request Access');

  // Initialize formData based on schema fields
  const [formData, setFormData] = useState<Record<string, string>>({});
  useEffect(() => {
    setFormData(prev => {
      const next: Record<string, string> = { ...prev };
      // Checkboxes start explicitly at 'no' so an untouched opt-in records a
      // refusal instead of an empty string we could not tell apart later.
      schema.fields.forEach(f => {
        if (!(f.name in next)) next[f.name] = f.type === 'checkbox' ? 'no' : '';
      });
      return next;
    });
  }, [schema.fields]);

  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [showError, setShowError] = useState(false);
  // The button used to flash "ERROR" for two seconds and go quiet, which left
  // people unable to tell whether the application had been sent. This message
  // stays on screen until the next attempt, and says what to do instead.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const [showCaptchaError, setShowCaptchaError] = useState(false);

  // Whether a captcha can be shown at all. Without the site key the widget
  // never renders, so requiring it would lock everyone out of the form.
  const captchaAvailable = Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY);
  const captchaEnforced  = schema.captcha_required && captchaAvailable;
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
      .filter(f => f.required && isFieldBlank(f, formData[f.name] ?? ''))
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

    if (captchaEnforced && !captchaValue) {
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

    setSending(true); setChaosLevel(0.2); setEmptyFields([]); setErrorMessage(null);
    smoothScrollTo(0, 2250);

    try {
      // Verify CAPTCHA in production
      if (captchaEnforced && import.meta.env.PROD && captchaValue) {
        const v = await fetch('/api/verify-captcha', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ captchaToken: captchaValue }),
        });
        const result = await v.json();
        if (!result.success) {
          setShowError(true); setShowCaptchaError(true);
          setErrorMessage('The "I\'m not a robot" check did not go through. Please tick it again and resend.');
          recaptchaRef.current?.reset(); setCaptchaValue(null);
          setTimeout(() => { setShowError(false); setShowCaptchaError(false); setChaosLevel(0); }, 2000);
          setSending(false);
          return;
        }
      }

      // Build submission payload from schema-defined fields
      const data: Record<string, string> = {};
      sortedFields.forEach(f => { data[f.name] = (formData[f.name] ?? '').trim(); });

      // Proof of consent. Storing the flag alone is worthless six months
      // later — what matters legally is the exact wording she agreed to and
      // when. Until now this died in React state and was never recorded.
      if (schema.terms_required) {
        data._terms_accepted = acceptedTerms ? 'yes' : 'no';
        data._terms_text     = schema.terms_text_html;
        data._terms_at       = new Date().toISOString();
      }

      const { error } = await supabase.from('form_submissions').insert({
        form_key: formKey,
        data,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      // Forward to the client's CRM only AFTER the row is safely stored, and
      // never let it break the submission — she keeps the applicant either way.
      const crmEmail = data[schema.crm_email_field || 'email'];
      if (schema.crm_post_url && crmEmail) {
        void fetch('/api/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            crmPostUrl: schema.crm_post_url,
            email:      crmEmail,
            fields:     data,
          }),
        }).catch(err => console.error('CRM forward failed (submission is saved):', err));
      }

      setSubmitted(true);
      recaptchaRef.current?.reset();
    } catch (err) {
      console.error('Form submission failed:', err);
      setShowError(true);
      setErrorMessage(
        navigator.onLine === false
          ? 'You appear to be offline. Your answers are still here — reconnect and press the button again.'
          : 'Your application was not sent. Nothing has been lost: press the button again, and if it keeps failing write to us instead.',
      );
      setTimeout(() => setShowError(false), 2000);
      recaptchaRef.current?.reset(); setCaptchaValue(null);
    } finally {
      setSending(false); setChaosLevel(0);
    }
  };

  const handleCaptchaChange = (v: string | null) => { setCaptchaValue(v); setShowCaptchaError(false); };

  // A slug the client never created must 404, not silently render the
  // default form under someone else's address.
  if (!schemaLoading && routeSlug && !formExists) return <NotFound />;

  // Don't paint until the schema lands, or the page flashes the default
  // title and event date for a beat before swapping to the real one.
  if (schemaLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Success view ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-bg text-primary flex items-center justify-center p-4 md:p-6 pt-24 md:pt-32 relative overflow-hidden cursor-crosshair">
        <WebGLBackground chaosLevel={0} bg={background} />
        <StandardHeader />

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
              <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, ease: 'linear' }, scale: { duration: 1, repeat: 1 } }} className="absolute inset-0 border-2 border-primary rounded-full opacity-60" />
              <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }} transition={{ duration: 1, repeat: 1 }} className="absolute inset-4 border border-primary rounded-full" />
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: 2 }} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-[0_0_20px_var(--color-primary)]" />
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
            whileHover={{ scale: 1.03, backgroundColor: brandColor() }} whileTap={{ scale: 0.97 }}
            className="border border-primary px-10 py-3 text-xs tracking-[0.3em] transition-colors uppercase font-bold mix-blend-exclusion hover:text-black"
          >
            {schema.return_label}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Form view ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-primary selection:bg-primary selection:text-black cursor-crosshair overflow-x-hidden">
      <WebGLBackground chaosLevel={chaosLevel} bg={background} />

      <StandardHeader />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-6 pt-20 md:pt-32 pb-8 md:pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-16">
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="w-2 h-2 bg-primary rounded-full mx-auto mb-10 shadow-[0_0_30px_var(--color-primary)]" />
            <AnimatedTitle text={schema.title} sending={sending} />
            <motion.div animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} className="w-48 h-[1px] bg-primary mx-auto my-8" />
            <motion.p animate={sending ? { opacity: 0, filter: 'blur(4px)' } : { opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5 }} className="text-base tracking-[0.5em] uppercase font-mono text-fg">
              {schema.subtitle}
            </motion.p>
          </div>

          {/* Event info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={sending ? { opacity: 0, filter: 'blur(8px)', scale: 0.95 } : { opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ delay: sending ? 0 : 0.3, duration: 0.5 }}
            className="mb-12 p-8 border border-primary/20 bg-black/60 backdrop-blur-sm"
          >
            <p className="text-base leading-relaxed text-center tracking-widest uppercase font-mono text-fg">
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
            {schema.terms_required && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.82 }} className="flex justify-center">
                <label className="flex items-start gap-3 cursor-pointer max-w-md">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-mono text-fg/60 leading-relaxed">
                    {renderTermsText(schema.terms_text_html)}
                  </span>
                </label>
              </motion.div>
            )}

            {/* CAPTCHA */}
            {captchaEnforced && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}
                className="flex flex-col items-center recaptcha-container"
              >
                <motion.div
                  animate={showCaptchaError ? { scale: [1, 1.05, 1, 1.05, 1], opacity: [1, 0.7, 1, 0.7, 1] } : {}}
                  transition={showCaptchaError ? { duration: 1.5, ease: 'easeInOut' } : {}}
                  className="transform scale-90 md:scale-100 origin-center"
                >
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={handleCaptchaChange}
                    theme="dark"
                  />
                </motion.div>
                {showCaptchaError && (
                  <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-[#ff0000] text-sm font-mono mt-4 tracking-wider uppercase">
                    Please complete the security verification
                  </motion.p>
                )}
              </motion.div>
            )}

            {/* Why it survives the flash: the button's red pulse lasts 1.5s and
                then the label goes back to "DONE", which reads as success. This
                stays until the next attempt. */}
            {errorMessage && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 mx-auto max-w-xl border border-red-500/40 bg-red-500/10 px-5 py-4
                           text-center text-sm leading-relaxed text-red-200"
              >
                {errorMessage}
              </motion.p>
            )}

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="flex justify-center pt-12">
              <motion.button
                type="submit"
                disabled={sending || (schema.terms_required && !acceptedTerms)}
                whileTap={{ scale: 0.95 }}
                animate={showError ? {
                  scale: [1, 1.05, 1, 1.05, 1],
                  backgroundColor: [brandColor(), '#ff0000', brandColor(), '#ff0000', brandColor()],
                } : sending ? { scale: [1, 1.05, 1] } : {}}
                transition={showError ? { duration: 1.5, ease: 'easeInOut' } : sending ? { duration: 0.3 } : {}}
                className="group relative bg-primary font-black text-lg py-5 px-16 uppercase tracking-[0.3em] overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(196,33,33,0.6)] disabled:opacity-70"
              >
                <span className="relative z-10 text-black">
                  {showError ? schema.submit_label_error : sending ? schema.submit_label_sending : schema.submit_label_idle}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary bg-[length:200%_100%] animate-gradient-x opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
