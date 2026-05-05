import { useState, useRef, useEffect, lazy, Suspense } from "react";
// Heavy screens are code-split — they load on demand the first time the user
// visits them. The auth bundle stays small so first paint is fast.
const ForgotPasswordScreen = lazy(() => import("./ForgotPassword").then(m => ({ default: m.ForgotPasswordScreen })));
const ScheduleScreen       = lazy(() => import("./ScheduleScreen"));
const MarketingScreen      = lazy(() => import("./MarketingScreen"));
const PrivacyPolicyScreen  = lazy(() => import("./LegalScreens").then(m => ({ default: m.PrivacyPolicyScreen })));
const TermsScreen          = lazy(() => import("./LegalScreens").then(m => ({ default: m.TermsScreen })));
import { signIn, signUp, signOut, getProfile, upsertProfile, getSessionUser, onAuthChange } from "./data/auth";
import { listClients, addClient as apiAddClient, updateClient as apiUpdateClient, deleteClient as apiDeleteClient } from "./data/clients";
import { listInvoices, upsertInvoice as apiUpsertInvoice, deleteInvoice as apiDeleteInvoice } from "./data/invoices";
import { listQuotes,   upsertQuote   as apiUpsertQuote,   deleteQuote   as apiDeleteQuote   } from "./data/quotes";
import { listJobs,     upsertJob     as apiUpsertJob,     deleteJob     as apiDeleteJob     } from "./data/jobs";
import { listTeam,     upsertTeamMember as apiUpsertTeam, deleteTeamMember as apiDeleteTeam } from "./data/team";

// ─── FONTS ─────────────────────────────────────────────────────────────────────
const loadFonts = () => {
  if (document.getElementById('fb-fonts')) return;
  const link = document.createElement('link');
  link.id = 'fb-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
  document.head.appendChild(link);
};

// ─── BREAKPOINT HOOK ───────────────────────────────────────────────────────────
function useBreakpoint() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return { isTablet: w < 1024, w };
}

// ─── TOKENS ────────────────────────────────────────────────────────────────────
// Color system: keep brand greens, soften borders, add elevation tones for layered depth.
const C = {
  bg:        '#f3f6f4',     // page background — slightly cooler than before
  surface:   '#ffffff',
  surface2:  '#fbfdfc',     // elevated cards: a hair off-white for depth
  raised:    '#f4f8f6',     // input fills, raised inset surfaces
  border:    '#e6ede9',     // hairline borders — softened from #d6e4de
  border2:   '#cfdfd6',     // medium border (focus rings, dividers)
  orange:    '#2d6a4f',     // brand green (kept under "orange" key for compat with the rest of the file)
  orangeLo:  '#eef7f2',
  orangeMd:  '#b7dfca',
  // Real orange — secondary brand accent for "in-flight" states (sent, viewed, awaiting).
  accent:    '#ea580c',     // vivid orange
  accentLo:  '#fff4ed',     // very pale orange wash
  accentMd:  '#fed7aa',     // medium orange
  text:      '#0f172a',
  // Bumped both grays darker — slate-500 (#64748b) doesn't survive sun glare on iPads.
  // muted is now slate-600 (~7:1 contrast on white), dim is slate-500.
  muted:     '#475569',
  dim:       '#64748b',
  success:   '#15803d',     // filled paid green — slightly punchier
  successLo: '#dcfce7',
  // Critical / overdue — bolder red. Two levels for filled vs subtle treatments.
  error:     '#dc2626',     // tag-text color
  errorBold: '#b91c1c',     // filled-pill bg
  errorLo:   '#fef2f2',
  warn:      '#d97706',
  warnLo:    '#fef3c7',
  // Elevation shadows — layered, brand-tinted, very soft.
  shadow1:   '0 1px 2px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.03)',
  shadow2:   '0 1px 2px rgba(15, 23, 42, 0.05), 0 8px 24px rgba(15, 23, 42, 0.06)',
  glow:      '0 0 0 3px rgba(45, 106, 79, 0.15)',  // focus ring around inputs
};

const s = {
  btn: {
    // Sentence-case-friendly default. Individual buttons can still override
    // with letterSpacing/textTransform when a specific component needs it.
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.005em',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    transition: 'background 0.15s, box-shadow 0.15s, transform 0.05s',
    WebkitTapHighlightColor: 'transparent',
  },
  input: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    color: C.text, borderRadius: 8, outline: 'none',
    fontFamily: "'Inter', sans-serif", fontSize: 16,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    WebkitAppearance: 'none',
  },
  label: {
    display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: C.muted, fontFamily: "'Inter', sans-serif",
  },
  // Reusable card surface — soft elevation + hairline border + smooth corners.
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    boxShadow: C.shadow1,
  },
};

// ── Shared UI primitives (used by both app and quotes sections) ──
const Btn = ({ children, onClick, disabled, style = {}, variant = 'primary', size = 'md', full }) => {
  const pad  = size === 'sm' ? '8px 14px' : size === 'lg' ? '14px 26px' : '11px 20px';
  const fz   = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  const base = variant === 'primary'
    ? { background: C.orange, color: '#ffffff', border: 'none', boxShadow: '0 1px 2px rgba(45, 106, 79, 0.2)' }
    : variant === 'ghost'
    ? { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }
    : { background: C.surface, color: C.text, border: `1px solid ${C.border}`, boxShadow: C.shadow1 };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...s.btn, ...base, padding: pad, fontSize: fz, fontWeight: 600, minHeight: 44, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : undefined, ...style }}
      onMouseEnter={e => { if (!disabled && variant === 'primary') e.currentTarget.style.boxShadow = '0 2px 8px rgba(45, 106, 79, 0.35)'; }}
      onMouseLeave={e => { if (!disabled && variant === 'primary') e.currentTarget.style.boxShadow = '0 1px 2px rgba(45, 106, 79, 0.2)'; }}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', style = {}, rows }) => {
  if (rows) return (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{ ...s.input, width: '100%', padding: '11px 13px', boxSizing: 'border-box', resize: typeof window !== 'undefined' && window.innerWidth < 1024 ? 'none' : 'vertical', lineHeight: 1.65, ...style }} />
  );
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...s.input, width: '100%', padding: '11px 13px', boxSizing: 'border-box', ...style }} />
  );
};

const Label = ({ children }) => <label style={s.label}>{children}</label>;

const Badge = ({ status }) => {
  // Quote status palette aligned with INV_STATUS: green-filled for accepted/invoiced,
  // orange for sent, gold for revised, FILLED red for declined. No blue, no purple.
  const map = {
    draft:    { label: 'Draft',    bg: '#f1f5f9', color: '#475569', filled: false },
    sent:     { label: 'Sent',     bg: '#fff4ed', color: '#c2410c', filled: false },
    accepted: { label: 'Accepted', bg: '#15803d', color: '#ffffff', filled: true  },
    declined: { label: 'Declined', bg: '#b91c1c', color: '#ffffff', filled: true  },
    revised:  { label: 'Revised',  bg: '#fef3c7', color: '#92400e', filled: false },
    invoiced: { label: 'Invoiced', bg: '#2d6a4f', color: '#ffffff', filled: true  },
  };
  const { label, bg, color, filled } = map[status] || map.draft;
  return (
    <span style={{
      fontSize: 12, fontWeight: filled ? 800 : 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '4px 11px', borderRadius: 5,
      background: bg, color,
      fontFamily: "'Inter', sans-serif",
      whiteSpace: 'nowrap', lineHeight: 1.6, display: 'inline-block',
      border: filled ? 'none' : `1px solid ${color}1a`,
      boxShadow: filled ? `0 1px 2px ${bg}66` : 'none',
    }}>
      {label}
    </span>
  );
};

const PrimaryBtn = ({ children, onClick, disabled, style = {}, size = 'md', full }) => {
  const pad = size === 'sm' ? '9px 18px' : size === 'lg' ? '14px 28px' : '12px 22px';
  const fz  = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s.btn, padding: pad, fontSize: fz, fontWeight: 700,
        background: C.orange, color: '#ffffff',
        boxShadow: '0 1px 2px rgba(45, 106, 79, 0.2)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: full ? '100%' : undefined, minHeight: 46, ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = '0 2px 8px rgba(45, 106, 79, 0.35)'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.boxShadow = '0 1px 2px rgba(45, 106, 79, 0.2)'; }}
    >
      {children}
    </button>
  );
};

const GhostBtn = ({ children, onClick, style = {}, size = 'md', full }) => {
  const pad = size === 'sm' ? '8px 14px' : '11px 20px';
  const fz  = size === 'sm' ? 13 : 15;
  return (
    <button onClick={onClick} style={{
      ...s.btn, padding: pad, fontSize: fz, fontWeight: 600,
      background: 'transparent', color: C.text,
      border: `1px solid ${C.border}`,
      width: full ? '100%' : undefined, minHeight: 44, ...style,
    }}>{children}</button>
  );
};

// ─── DATA ──────────────────────────────────────────────────────────────────────
const TRADES      = ['Plumber','Electrician','HVAC','Roofing','Specialty'];
const TRADE_ICONS = { Plumber:'PL', Electrician:'EL', HVAC:'HV', Roofing:'RF', Specialty:'SP' };
const WORK_TYPES  = ['Residential','Commercial','Both'];

// Specialty sub-types — explicitly excludes licensed trades
const SPECIALTY_TYPES = [
  'Painter',
  'Flooring Installer',
  'Drywall / Plasterer',
  'Tile Setter',
  'Carpenter',
  'Landscaping / Irrigation',
  'Appliance Repair',
  'Locksmith',
  'Garage Door',
  'Pest Control',
  'Pressure Washing',
  'Fence & Deck',
  'Window & Door',
  'Insulation',
  'Other Specialty',
];
const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.',
];
const getPrice = (n) => n >= 3 ? 149.99 : n === 2 ? 99.99 : 49.99;

// ── Official Tradevoice Logo ─────────────────────────────────────────────────
const TRADEVOICE_LOGO = 'data:image/png;base64,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';

const Logo = ({ size = 24 }) => (
  <img
    src={TRADEVOICE_LOGO}
    alt="Tradevoice"
    style={{ height: size * 2.2, maxWidth: size * 8, objectFit: 'contain', display: 'block', overflow: 'visible', marginTop: -6 }}
  />
);

const SectionHead = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: icon ? 10 : 0 }}>
      {icon && <span style={{ fontSize: 22 }}>{icon}</span>}
      <h1 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.025em' }}>{title}</h1>
    </div>
    {sub && <p style={{ margin: '6px 0 0', fontSize: 15, color: C.muted, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{sub}</p>}
  </div>
);

const StatCard = ({ icon, label, value, color = C.orange }) => (
  <div style={{
    // Gradient wash tinted to the card's color — gives each tile real personality.
    // White card with a soft tint of the accent color at the bottom-right corner.
    background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface} 55%, ${color}0d 100%)`,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: C.shadow1,
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'default',
  }}
  onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadow2; e.currentTarget.style.transform = 'translateY(-1px)'; }}
  onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow1; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    {/* Bold accent stripe — 4px gradient with a fade-out tail on the right. */}
    <div style={{ height: 4, background: `linear-gradient(90deg, ${color} 0%, ${color} 60%, ${color}88 100%)` }} />
    <div style={{ padding: '18px 20px 20px', textAlign: 'center' }}>
      {/* Larger label and bolder weight for sun-readable text outdoors on iPad. */}
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 42, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{value}</div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// AUTH SCREENS — Login / Sign Up / Join Company
// ══════════════════════════════════════════════════════════════════════════════

function AuthShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: 28 }}><Logo size={38} /></div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '32px 28px', width: '100%', maxWidth: 420 }}>
        {children}
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignup, onJoin, onForgot }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const authUser = await signIn(email.trim(), password);
      const profile  = await getProfile(authUser.id, authUser.email);
      onLogin(profile ?? { id: authUser.id, email: authUser.email, role: 'owner', trades: [], states: [] });
    } catch (e) {
      setError(e?.message || 'Could not sign in. Check your email and password.');
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>Welcome back</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Sign in to your Tradevoice account</div>

      {error && <div style={{ background: '#fef2f2', border: `1px solid ${C.error}33`, borderRadius: 6, padding: '9px 12px', fontSize: 13, color: C.error, marginBottom: 14 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
        <div>
          <label style={s.label}>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="matt@company.com"
            style={{ ...s.input, width: '100%', padding: '11px 13px', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...s.label, margin: 0 }}>Password</label>
            <button type="button" onClick={onForgot} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: C.orange, textDecoration: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Forgot password?</button>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ ...s.input, width: '100%', padding: '11px 13px', boxSizing: 'border-box' }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
        </div>
      </div>

      <button onClick={handleLogin} disabled={loading} style={{
        ...s.btn, width: '100%', background: loading ? C.muted : C.orange, color: '#fff',
        padding: '12px', fontSize: 14, letterSpacing: '0.06em', borderRadius: 50,
        border: 'none', marginBottom: 14, opacity: loading ? 0.7 : 1,
      }}>{loading ? 'Signing in…' : 'Sign In'}</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 11, color: C.dim }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {/* Google sign in */}
      <button style={{ ...s.btn, width: '100%', background: C.surface, border: `1.5px solid ${C.border2}`, color: C.text, padding: '11px', fontSize: 13, borderRadius: 50, marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Continue with Google
      </button>

      <div style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginBottom: 8 }}>
        New to Tradevoice?{' '}
        <button onClick={onSignup} style={{ background: 'none', border: 'none', padding: 0, color: C.orange, fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
          Create an account →
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: C.muted }}>
        Got a company code? <button onClick={onJoin} style={{ background: 'none', border: 'none', color: C.orange, fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>Join a company</button>
      </div>
    </AuthShell>
  );
}

// ── SIGN UP (owner creating company account) ──────────────────────────────────
function SignupScreen({ onComplete, onBack }) {
  const { isTablet } = useBreakpoint();
  const [step, setStep]       = useState(0); // 0=account, 1=company, 2=plan
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone]     = useState('');
  const [trades, setTrades]   = useState([]);
  const [states, setStates]   = useState(['Texas']);
  const [plan, setPlan]       = useState('pro');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const PLANS_SU = [
    { id: 'solo', name: 'Solo', price: '$49.99', trades: '1 trade', desc: 'Just you — one trade, full power' },
    { id: 'pro',  name: 'Pro',  price: '$99.99', trades: 'Up to 3 trades', desc: 'Growing contractor, multiple trades', popular: true },
    { id: 'all',  name: 'All Trades', price: '$149.99', trades: 'All 5 trades', desc: 'Full-service multi-trade contractor' },
  ];
  const TRADES_LIST = ['Plumber','Electrician','HVAC','Roofing','Specialty'];

  const steps = ['Account', 'Company', 'Plan'];
  const canNext = [
    () => name.trim() && email.trim() && password.length >= 6,
    () => company.trim() && trades.length > 0,
    () => plan !== '' && acceptedTerms,
  ];

  const finish = () => {
    onComplete({ name, email, password, company, phone, trades, states, plan, acceptedTermsAt: new Date().toISOString() });
  };

  return (
    <AuthShell>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        {steps.map((lbl, i) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i <= step ? C.orange : C.raised, border: `2px solid ${i <= step ? C.orange : C.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: i <= step ? '#fff' : C.dim, flexShrink: 0 }}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? C.orange : C.border2 }} />}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
        {step === 0 ? 'Create your account' : step === 1 ? 'Your company' : 'Choose your plan'}
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 22 }}>
        {step === 0 ? 'Free 28-day trial — no card required' : step === 1 ? 'Tell us about your business' : 'All plans include every feature'}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div><label style={s.label}>Your name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Matthew Burke" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
          <div><label style={s.label}>Email address *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="matt@company.com" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
          <div><label style={s.label}>Password * <span style={{ color: C.dim, fontWeight: 400 }}>(min 6 characters)</span></label><input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div><label style={s.label}>Company name *</label><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Burke's Mechanical" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
          <div><label style={s.label}>Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(512) 555-0000" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
          <div>
            <label style={s.label}>Your trade(s) *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TRADES_LIST.map(t => (
                <button key={t} onClick={() => setTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={{ ...s.btn, padding: '10px 12px', fontSize: 14, background: trades.includes(t) ? C.orange : C.raised, border: `2px solid ${trades.includes(t) ? C.orange : C.border2}`, color: trades.includes(t) ? '#fff' : C.muted, borderRadius: 8, textAlign: 'left' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANS_SU.map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)} style={{ ...s.btn, padding: '14px 16px', background: plan === p.id ? C.orangeLo : C.surface, border: `2px solid ${plan === p.id ? C.orange : C.border}`, borderRadius: 10, textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: plan === p.id ? C.orange : C.text }}>{p.name} {p.popular && <span style={{ fontSize: 11, background: C.orange, color: '#fff', padding: '2px 8px', borderRadius: 10, marginLeft: 6 }}>Popular</span>}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{p.trades} · {p.desc}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: plan === p.id ? C.orange : C.text, fontFamily: "'Inter', sans-serif" }}>{p.price}<span style={{ fontSize: 12, fontWeight: 400 }}>/mo</span></div>
            </button>
          ))}
          <div style={{ fontSize: 13, color: C.dim, marginTop: 4, textAlign: 'center' }}>28-day free trial · No credit card needed · Cancel anytime</div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8 }}>
            Need team members? Add techs for <strong style={{ color: C.orange }}>$19.99/mo each</strong> after sign-up in Settings → Team. 28-day free trial on all plans.
          </div>

          {/* Terms + Privacy clickwrap — required */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', marginTop: 14, background: acceptedTerms ? C.orangeLo : C.raised, border: `1.5px solid ${acceptedTerms ? C.orange : C.border2}`, borderRadius: 8, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: C.orange, cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              I agree to the{' '}
              <a href="https://thetradevoice.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.orange, fontWeight: 700, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Terms of Service</a>
              {' '}and{' '}
              <a href="https://thetradevoice.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.orange, fontWeight: 700, textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Privacy Policy</a>.
            </span>
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={step === 0 ? onBack : () => setStep(s => s - 1)} style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '13px 20px', fontSize: 15, borderRadius: 50, flex: '0 0 auto' }}>
          {step === 0 ? 'Sign in' : '← Back'}
        </button>
        <button onClick={step < 2 ? () => setStep(s => s + 1) : finish} disabled={!canNext[step]()} style={{ ...s.btn, flex: 1, background: canNext[step]() ? C.orange : C.border2, color: '#fff', padding: '13px', fontSize: 15, borderRadius: 50, border: 'none', opacity: canNext[step]() ? 1 : 0.5 }}>
          {step < 2 ? 'Continue →' : 'Start Free Trial'}
        </button>
      </div>
    </AuthShell>
  );
}

// ── JOIN COMPANY (tech entering company code) ─────────────────────────────────
function JoinScreen({ onJoin, onBack }) {
  const [code,     setCode]    = useState('');
  const [name,     setName]    = useState('');
  const [email,    setEmail]   = useState('');
  const [password, setPass]    = useState('');
  const [found,    setFound]   = useState(null);
  const [error,    setError]   = useState('');
  const [step,     setStep]    = useState(0); // 0=code, 1=profile

  const lookupCode = () => {
    setError('');
    if (code.toUpperCase() === 'TV-BRK42X') {
      setFound({ company: "Burke's Mechanical", owner: 'Matthew Burke', trades: ['Plumber','HVAC'] });
      setStep(1);
    } else {
      setError('Company code not found. Check with your employer and try again.');
    }
  };

  const finish = () => {
    if (!name.trim() || !email.trim() || password.length < 6) { setError('Please fill in all fields.'); return; }
    onJoin({ name, email, company: found.company, trades: found.trades, companyCode: code.toUpperCase(), role: 'tech', states: ['Texas'], state: 'Texas',
      perms: { createQuotes: true, createInvoices: true, viewAllJobs: false, recordPayments: true, viewClients: true, viewDashboard: false } });
  };

  return (
    <AuthShell>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}>
        {step === 0 ? 'Join your company' : 'Create your profile'}
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 22 }}>
        {step === 0 ? 'Your employer will give you the company code' : `Joining ${found?.company}`}
      </div>

      {error && <div style={{ background: '#fef2f2', border: `1px solid ${C.error}33`, borderRadius: 6, padding: '10px 14px', fontSize: 14, color: C.error, marginBottom: 16 }}>{error}</div>}

      {step === 0 && (
        <>
          <label style={s.label}>Company code</label>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="TV-XXXXXX"
            style={{ ...s.input, width: '100%', padding: '16px 14px', boxSizing: 'border-box', fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center', marginBottom: 16 }}
            onKeyDown={e => e.key === 'Enter' && lookupCode()} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBack} style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '13px 20px', fontSize: 15, borderRadius: 50 }}>← Back</button>
            <button onClick={lookupCode} disabled={code.length < 6} style={{ ...s.btn, flex: 1, background: C.orange, color: '#fff', padding: '13px', fontSize: 15, borderRadius: 50, border: 'none', opacity: code.length < 6 ? 0.5 : 1 }}>Find Company</button>
          </div>
        </>
      )}

      {step === 1 && found && (
        <>
          <div style={{ background: C.orangeLo, border: `1px solid ${C.orange}44`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              {found.company.split(' ').map(w => w[0]).join('').slice(0,2)}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{found.company}</div>
              <div style={{ fontSize: 13, color: C.muted }}>Owner: {found.owner} · {found.trades.join(', ')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
            <div><label style={s.label}>Your name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Carlos Reyes" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
            <div><label style={s.label}>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="carlos@company.com" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
            <div><label style={s.label}>Password * <span style={{ color: C.dim, fontWeight: 400 }}>(min 6 characters)</span></label><input type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 16 }}/></div>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, background: C.raised, borderRadius: 8, padding: '10px 14px' }}>
            Your employer will set your permissions after you join. You'll have access to the features they enable for you.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setStep(0); setError(''); }} style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '13px 20px', fontSize: 15, borderRadius: 50 }}>← Back</button>
            <button onClick={finish} style={{ ...s.btn, flex: 1, background: C.orange, color: '#fff', padding: '13px', fontSize: 15, borderRadius: 50, border: 'none' }}>Join {found.company}</button>
          </div>
        </>
      )}
    </AuthShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════════════════
const STEPS = ['Trade','Work Type','Location','Profile'];

function Onboarding({ onComplete }) {
  const { isTablet } = useBreakpoint();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ trades: [], specialtyTypes: [], workType: '', states: [], name: '', company: '', email: '', phone: '' });
  const [multiState, setMultiState] = useState(false);

  const toggle = (trade) => setData(d => ({
    ...d,
    trades: d.trades.includes(trade) ? d.trades.filter(t => t !== trade) : [...d.trades, trade],
    // Clear specialty types if Specialty is being deselected
    specialtyTypes: trade === 'Specialty' && d.trades.includes(trade) ? [] : d.specialtyTypes,
  }));

  const toggleSpecialty = (type) => setData(d => ({
    ...d,
    specialtyTypes: d.specialtyTypes.includes(type)
      ? d.specialtyTypes.filter(t => t !== type)
      : [...d.specialtyTypes, type],
  }));

  const toggleState = (st) => setData(d => ({
    ...d, states: d.states.includes(st) ? d.states.filter(s => s !== st) : [...d.states, st],
  }));

  const specialtyRequired = data.trades.includes('Specialty');

  const ok = [
    () => data.trades.length > 0 && (!specialtyRequired || data.specialtyTypes.length > 0),
    () => data.workType !== '',
    () => data.states.length > 0,
    () => data.name.trim() && data.email.trim(),
  ][step];

  const inputField = (key, label, placeholder, type = 'text', req = false) => (
    <div key={key}>
      <label style={s.label}>{label}{req && <span style={{ color: C.orange }}> *</span>}</label>
      <input type={type} value={data[key]} placeholder={placeholder}
        onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
        style={{ ...s.input, width: '100%', padding: '13px 14px', boxSizing: 'border-box', fontSize: 20, borderColor: data[key] ? C.orange : C.border2 }} />
    </div>
  );

  const priceLabel = data.trades.length === 0 ? null
    : data.trades.length === 5 ? '$149.99/mo — all trades'
    : `$${getPrice(data.trades.length)}/mo`;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: isTablet ? '24px 16px' : 24 }}>
      <div style={{ marginBottom: 12 }}><Logo size={52} /></div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 32, textAlign: 'center', lineHeight: 1.5, maxWidth: 340 }}>
        From first estimate to final payment.
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800,
              background: i < step ? C.orange : 'transparent',
              border: `2px solid ${i <= step ? C.orange : C.border2}`,
              color: i < step ? '#fff' : i === step ? C.orange : C.dim,
            }}>{i < step ? 'Done' : i + 1}</div>
            {!isTablet && <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: i === step ? C.text : C.dim }}>{label}</span>}
            {i < STEPS.length - 1 && <div style={{ width: isTablet ? 12 : 20, height: 1, background: C.border2, margin: '0 2px' }} />}
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 480, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 4, padding: isTablet ? '28px 20px' : '36px 32px' }}>

        {step === 0 && <>
          <h2 style={{ margin: '0 0 6px', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Select Trade(s)</h2>
          <p style={{ margin: '0 0 20px', fontSize: 18, color: C.muted }}>Select every trade your business offers. Pricing adjusts automatically.</p>

          {/* Licensed trades — top 4 */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Licensed Trades</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['Plumber','Electrician','HVAC','Roofing'].map(t => {
                const on = data.trades.includes(t);
                return (
                  <button key={t} onClick={() => toggle(t)} style={{
                    ...s.btn, padding: '16px 12px', fontSize: 20, minHeight: 56,
                    background: on ? C.orange : C.raised,
                    border: `2px solid ${on ? C.orange : C.border2}`,
                    color: on ? '#fff' : C.text,
                  }}>{t}</button>
                );
              })}
            </div>
          </div>

          {/* Specialty Trades — gated with sub-selection */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Specialty Trades</div>
            <div style={{ fontSize: 15, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
              For non-licensed work: painting, flooring, drywall, tile, landscaping, and more.
              <strong style={{ color: C.error }}> Does not cover Plumbing, Electrical, HVAC, or Roofing.</strong>
            </div>
            <button onClick={() => toggle('Specialty')} style={{
              ...s.btn, width: '100%', padding: '14px 16px', fontSize: 20, minHeight: 52, textAlign: 'left',
              background: data.trades.includes('Specialty') ? C.orange : C.raised,
              border: `2px solid ${data.trades.includes('Specialty') ? C.orange : C.border2}`,
              color: data.trades.includes('Specialty') ? '#fff' : C.text,
            }}>
              Specialty Trades {data.specialtyTypes.length > 0 ? `— ${data.specialtyTypes.length} selected` : ''}
            </button>

            {/* Sub-selection — only visible when Specialty is toggled on */}
            {data.trades.includes('Specialty') && (
              <div style={{ marginTop: 10, padding: '14px', background: C.raised, border: `1.5px solid ${C.border2}`, borderRadius: 3 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
                  What type of specialty work do you perform? <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {SPECIALTY_TYPES.map(type => {
                    const on = data.specialtyTypes.includes(type);
                    return (
                      <button key={type} onClick={() => toggleSpecialty(type)} style={{
                        ...s.btn, padding: '10px 10px', fontSize: 16, minHeight: 44, textAlign: 'left',
                        background: on ? '#fff7ed' : C.surface,
                        border: `1.5px solid ${on ? C.orange : C.border2}`,
                        color: on ? C.orange : C.text,
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: on ? 700 : 400,
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}>{type}</button>
                    );
                  })}
                </div>
                {data.specialtyTypes.length === 0 && (
                  <div style={{ marginTop: 10, fontSize: 14, color: C.error }}>
                    Select at least one specialty type to continue.
                  </div>
                )}
              </div>
            )}
          </div>

          {priceLabel && <div style={{ marginTop: 14, padding: '10px 14px', background: C.orangeLo, border: `1px solid ${C.orangeMd}`, borderRadius: 3, fontSize: 18, color: C.orange, fontWeight: 600 }}>{priceLabel}</div>}
        </>}

        {step === 1 && <>
          <h2 style={{ margin: '0 0 6px', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Type of Work</h2>
          <p style={{ margin: '0 0 20px', fontSize: 18, color: C.muted }}>What kind of jobs do you run?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {WORK_TYPES.map(w => {
              const on = data.workType === w;
              return (
                <button key={w} onClick={() => setData(d => ({ ...d, workType: w }))} style={{ ...s.btn, padding: '15px 18px', fontSize: 21, textAlign: 'left', minHeight: 52, background: on ? C.orange : C.raised, border: `2px solid ${on ? C.orange : C.border2}`, color: on ? '#fff' : C.text }}>
                  {w}
                </button>
              );
            })}
          </div>
        </>}

        {step === 2 && <>
          <h2 style={{ margin: '0 0 6px', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            {multiState ? 'Select Your States' : 'Your State'}
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: 18, color: C.muted }}>
            {multiState ? 'Select every state you are licensed to operate in.' : 'Licensing requirements load automatically once selected.'}
          </p>

          {/* Single / Multi toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={() => { setMultiState(false); setData(d => ({ ...d, states: d.states.slice(0, 1) })); }} style={{
              ...s.btn, flex: 1, padding: '10px 14px', fontSize: 16, minHeight: 44,
              background: !multiState ? C.orange : C.raised,
              border: `2px solid ${!multiState ? C.orange : C.border2}`,
              color: !multiState ? '#fff' : C.muted,
            }}>Single State</button>
            <button onClick={() => setMultiState(true)} style={{
              ...s.btn, flex: 1, padding: '10px 14px', fontSize: 16, minHeight: 44,
              background: multiState ? C.orange : C.raised,
              border: `2px solid ${multiState ? C.orange : C.border2}`,
              color: multiState ? '#fff' : C.muted,
            }}>Multi-State</button>
          </div>

          {/* Single state — dropdown */}
          {!multiState && (
            <select
              value={data.states[0] || ''}
              onChange={e => setData(d => ({ ...d, states: e.target.value ? [e.target.value] : [] }))}
              style={{ ...s.input, width: '100%', padding: '14px 14px', boxSizing: 'border-box', fontSize: 20, cursor: 'pointer', minHeight: 52, borderColor: data.states.length ? C.orange : C.border2 }}>
              <option value="">— Select state —</option>
              {STATES.map(st => <option key={st}>{st}</option>)}
            </select>
          )}

          {/* Multi state — scrollable chip grid */}
          {multiState && (
            <div>
              {/* Selected chips */}
              {data.states.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {data.states.map(st => (
                    <button key={st} onClick={() => toggleState(st)} style={{
                      ...s.btn, padding: '6px 12px', fontSize: 14, minHeight: 34,
                      background: C.orange, color: '#ffffff', border: 'none',
                    }}>
                      {st} &times;
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable state list */}
              <div style={{ maxHeight: 220, overflowY: 'auto', border: `1.5px solid ${C.border2}`, borderRadius: 3, background: C.raised }}>
                {STATES.map(st => {
                  const selected = data.states.includes(st);
                  return (
                    <button key={st} onClick={() => toggleState(st)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: selected ? C.orangeLo : 'transparent',
                      border: 'none', borderBottom: `1px solid ${C.border}`,
                      color: selected ? C.orange : C.text, cursor: 'pointer', textAlign: 'left',
                      fontSize: 17, fontFamily: "'Inter', sans-serif",
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                      <span>{st}</span>
                      {selected && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 900, letterSpacing: '0.06em', color: C.orange }}>Selected</span>}
                    </button>
                  );
                })}
              </div>

              {data.states.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 16, color: C.orange, fontWeight: 600 }}>
                  {data.states.length} state{data.states.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}
        </>}

        {step === 3 && <>
          <h2 style={{ margin: '0 0 6px', fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Your Profile</h2>
          <p style={{ margin: '0 0 20px', fontSize: 18, color: C.muted }}>This appears on your invoices and proposals.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inputField('name',    'Your Name',    'John Burke',                'text',  true)}
            {inputField('company', 'Company Name', "Burke's Mechanical",        'text',  false)}
            {inputField('email',   'Email',        'john@burkesmechanical.com', 'email', true)}
            {inputField('phone',   'Phone',        '(555) 000-0000',            'tel',   false)}
          </div>
        </>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {step > 0 ? <GhostBtn onClick={() => setStep(s => s - 1)}>Back</GhostBtn> : <span />}
          <PrimaryBtn onClick={() => step < 3 ? setStep(s => s + 1) : onComplete(data)} disabled={!ok()}>
            {step < 3 ? 'Continue' : 'Launch Tradevoice'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ user, nav, invoices = [] }) {
  const { isTablet } = useBreakpoint();
  const firstName = user.name?.split(' ')[0] || 'Contractor';

  // Compute live stats from real invoices
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthInvoices = invoices.filter(i => (i.createdAt || '').startsWith(thisMonth));
  const outstanding   = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'draft' && i.status !== 'void')
    .reduce((sum, i) => sum + calcInvoice(i, user?.state).balance, 0);
  const paidInvoices  = invoices.filter(i => i.status === 'paid');
  const avgInvoice    = invoices.length
    ? invoices.reduce((sum, i) => sum + calcInvoice(i, user?.state).total, 0) / invoices.length
    : 0;

  const recent = [...invoices]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 4);

  const subtitleParts = [user.company, user.trades?.join(' — '), user.states?.join(', ') || user.state].filter(Boolean);

  return (
    <div>
      <SectionHead icon="" title={`Hey, ${firstName}`}
        sub={subtitleParts.length ? subtitleParts.join('  —  ') : 'Welcome to Tradevoice'} />

      {/* Stats — 2×2 on tablet, 4 across on laptop */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        <StatCard icon="" label="Invoices This Month" value={String(monthInvoices.length)} color={C.orange} />
        <StatCard icon="" label="Outstanding"         value={fmtMoney(outstanding)} color={outstanding > 0 ? C.errorBold : C.muted} />
        <StatCard icon="" label="Jobs Completed"      value={String(paidInvoices.length)} color={C.success} />
        <StatCard icon="" label="Avg. Invoice"        value={fmtMoney(avgInvoice)} color={C.accent} />
      </div>

      {/* Body — stacks fully on tablet */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 290px', gap: 14 }}>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 18px' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Recent Invoices</div>
          {recent.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
              No invoices yet.{' '}
              <button onClick={() => nav('invoice')} style={{ background: 'none', border: 'none', color: C.orange, cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
                Create your first invoice →
              </button>
            </div>
          ) : recent.map((inv, i) => {
            const calc = calcInvoice(inv, user?.state);
            return (
              <div key={inv.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 10px', margin: '0 -10px',
                borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : 'none',
                gap: 12,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background 0.12s, transform 0.05s',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface2; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{inv.clientName || '—'}</div>
                  <div style={{ fontSize: 14, color: C.muted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{inv.title} — {inv.createdAt}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 800, fontFamily: "'Inter', sans-serif", color: C.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{fmtMoney(calc.total)}</div>
                  <InvBadge status={inv.status} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 18px' }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'New Invoice', sec: 'invoice' },
              { label: 'New Quote',   sec: 'quotes'  },
            ].map(a => (
              <button key={a.label} onClick={() => nav(a.sec)} style={{
                flex: 1, minWidth: 110,
                padding: '13px 22px',
                // Diagonal gradient — green primary into a deeper green for a bolder, dimensional look.
                background: a.label === 'New Quote'
                  ? `linear-gradient(135deg, ${C.accent} 0%, #c2410c 100%)`   // orange gradient — quotes are warm/in-flight
                  : `linear-gradient(135deg, ${C.orange} 0%, #1f4d39 100%)`,  // green gradient — invoices are the money
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                transition: 'box-shadow 0.2s, transform 0.05s',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: a.label === 'New Quote'
                  ? '0 2px 4px rgba(234, 88, 12, 0.25)'
                  : '0 2px 4px rgba(45, 106, 79, 0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = a.label === 'New Quote'
                ? '0 4px 14px rgba(234, 88, 12, 0.4)'
                : '0 4px 14px rgba(45, 106, 79, 0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = a.label === 'New Quote'
                ? '0 2px 4px rgba(234, 88, 12, 0.25)'
                : '0 2px 4px rgba(45, 106, 79, 0.25)'; }}
              >
                {a.label}
              </button>
            ))}
          </div>
          {!isTablet && (
            <div style={{ marginTop: 16, padding: '12px', background: C.orangeLo, border: `1px solid ${C.orangeMd}`, borderRadius: 3 }}>
              <div style={{ fontSize: 11, color: C.orange, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Your Plan</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 900, color: C.orange }}>
                ${getPrice(user.trades?.length || 1)}<span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{user.trades?.join(', ')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE MODULE — QuickBooks-aligned tracking
// ══════════════════════════════════════════════════════════════════════════════
let invoiceCounter = 5;
const nextInvNum = () => { const n = invoiceCounter++; return `INV-2026-${String(n).padStart(4,'0')}`; };
const fmtMoney = n => '$' + Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, days) => { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate()+days); return d.toISOString().split('T')[0]; };
const daysDiff = (a, b) => Math.floor((new Date(b+'T12:00:00') - new Date(a+'T12:00:00')) / 86400000);

// ── Payment fee model ─────────────────────────────────────────────────────────
// Client pays all fees — contractor always receives their full invoice amount
const STRIPE_PCT   = 0.029;   // 2.9% — Stripe's cut
const STRIPE_FIXED = 0.30;    // $0.30 — Stripe's fixed fee per transaction
const FIELDBILL_PCT = 0.01;   // 1.0% — Tradevoice platform fee (passive income)
const TOTAL_FEE_PCT = STRIPE_PCT + FIELDBILL_PCT; // 3.9% total

// Calculate what the client is charged so contractor receives exactly invoiceTotal
// Formula: clientCharge = (invoiceTotal + STRIPE_FIXED) / (1 - TOTAL_FEE_PCT)
const calcOnlineCharge = (invoiceTotal) => {
  const clientCharge = (invoiceTotal + STRIPE_FIXED) / (1 - TOTAL_FEE_PCT);
  const totalFee     = clientCharge - invoiceTotal;
  const stripeFee    = clientCharge * STRIPE_PCT + STRIPE_FIXED;
  const fieldbillFee = clientCharge * FIELDBILL_PCT;
  return {
    clientCharge: Math.round(clientCharge * 100) / 100,
    totalFee:     Math.round(totalFee     * 100) / 100,
    stripeFee:    Math.round(stripeFee    * 100) / 100,
    fieldbillFee: Math.round(fieldbillFee * 100) / 100,
  };
};
const PAYMENT_TERMS = [
  { label: 'Due on Receipt', days: 0  },
  { label: 'Net 15',         days: 15 },
  { label: 'Net 30',         days: 30 },
  { label: 'Net 45',         days: 45 },
  { label: 'Net 60',         days: 60 },
  { label: 'Net 90',         days: 90 },
];

// Invoice statuses — QB-aligned
// Status palette: green for paid, orange for in-flight (sent/viewed), gold for partial,
// FILLED red for overdue (so it pops in tables), gray for draft/void. No more blue.
const INV_STATUS = {
  draft:   { label:'Draft',   bg:'#f1f5f9', color:'#475569', filled:false },
  sent:    { label:'Sent',    bg:'#fff4ed', color:'#c2410c', filled:false },  // light-orange wash
  viewed:  { label:'Viewed',  bg:'#fffbeb', color:'#a16207', filled:false },  // amber
  partial: { label:'Partial', bg:'#fef3c7', color:'#92400e', filled:false },  // gold
  paid:    { label:'Paid',    bg:'#15803d', color:'#ffffff', filled:true  },  // filled green — celebrate it
  overdue: { label:'Overdue', bg:'#b91c1c', color:'#ffffff', filled:true  },  // filled red — can't miss it
  void:    { label:'Void',    bg:'#f1f5f9', color:'#94a3b8', filled:false },
};

// ── State tax rules for contractor labor ─────────────────────────────────────
// Most states: labor on real property improvement is NOT taxable
// These states tax labor on repair/maintenance/service work:
// ── State Tax Configuration — all 50 states, 2026 rates ──────────────────────
// matTax: sales tax on materials/equipment (state base rate, Jan 2026)
// laborTax: sales tax on labor (0 for most states — only applies to repair/service work in these states)
// laborNote: explains when labor IS taxable in that state
// All rates are DEFAULTS — contractors can override in Settings > Tax Rates
const STATE_TAX_DEFAULTS = {
  'Alabama':        { matTax: 4.0,    laborTax: 0,   laborNote: '' },
  'Alaska':         { matTax: 0,      laborTax: 0,   laborNote: 'No statewide sales tax (local taxes may apply)' },
  'Arizona':        { matTax: 5.6,    laborTax: 5.6, laborNote: 'Transaction privilege tax applies to repair/maintenance labor' },
  'Arkansas':       { matTax: 6.5,    laborTax: 0,   laborNote: '' },
  'California':     { matTax: 7.25,   laborTax: 0,   laborNote: 'Labor on real property improvement exempt' },
  'Colorado':       { matTax: 2.9,    laborTax: 0,   laborNote: '' },
  'Connecticut':    { matTax: 6.35,   laborTax: 0,   laborNote: '' },
  'Delaware':       { matTax: 0,      laborTax: 0,   laborNote: 'No sales tax (gross receipts tax applies to business)' },
  'Florida':        { matTax: 6.0,    laborTax: 0,   laborNote: 'Labor on real property improvement generally exempt' },
  'Georgia':        { matTax: 4.0,    laborTax: 0,   laborNote: '' },
  'Hawaii':         { matTax: 4.0,    laborTax: 4.0, laborNote: 'GET applies to most services including contractor labor' },
  'Idaho':          { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Illinois':       { matTax: 6.25,   laborTax: 0,   laborNote: '' },
  'Indiana':        { matTax: 7.0,    laborTax: 0,   laborNote: '' },
  'Iowa':           { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Kansas':         { matTax: 6.5,    laborTax: 6.5, laborNote: 'Labor installing tangible personal property is taxable' },
  'Kentucky':       { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Louisiana':      { matTax: 4.45,   laborTax: 0,   laborNote: '' },
  'Maine':          { matTax: 5.5,    laborTax: 0,   laborNote: '' },
  'Maryland':       { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Massachusetts':  { matTax: 6.25,   laborTax: 0,   laborNote: '' },
  'Michigan':       { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Minnesota':      { matTax: 6.875,  laborTax: 0,   laborNote: '' },
  'Mississippi':    { matTax: 7.0,    laborTax: 7.0, laborNote: 'Labor on repair/maintenance taxable' },
  'Missouri':       { matTax: 4.225,  laborTax: 0,   laborNote: '' },
  'Montana':        { matTax: 0,      laborTax: 0,   laborNote: 'No sales tax' },
  'Nebraska':       { matTax: 5.5,    laborTax: 0,   laborNote: '' },
  'Nevada':         { matTax: 6.85,   laborTax: 0,   laborNote: '' },
  'New Hampshire':  { matTax: 0,      laborTax: 0,   laborNote: 'No sales tax' },
  'New Jersey':     { matTax: 6.625,  laborTax: 0,   laborNote: '' },
  'New Mexico':     { matTax: 5.0,    laborTax: 5.0, laborNote: 'Gross receipts tax applies to labor and materials' },
  'New York':       { matTax: 4.0,    laborTax: 0,   laborNote: 'Labor on capital improvement exempt; repair labor taxable' },
  'North Carolina': { matTax: 4.75,   laborTax: 0,   laborNote: '' },
  'North Dakota':   { matTax: 5.0,    laborTax: 0,   laborNote: '' },
  'Ohio':           { matTax: 5.75,   laborTax: 0,   laborNote: '' },
  'Oklahoma':       { matTax: 4.5,    laborTax: 0,   laborNote: '' },
  'Oregon':         { matTax: 0,      laborTax: 0,   laborNote: 'No sales tax' },
  'Pennsylvania':   { matTax: 6.0,    laborTax: 0,   laborNote: 'Construction labor on real property exempt' },
  'Rhode Island':   { matTax: 7.0,    laborTax: 0,   laborNote: '' },
  'South Carolina': { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'South Dakota':   { matTax: 4.5,    laborTax: 4.5, laborNote: 'Services broadly taxable including contractor labor' },
  'Tennessee':      { matTax: 7.0,    laborTax: 0,   laborNote: '' },
  'Texas':          { matTax: 6.25,   laborTax: 6.25,laborNote: 'Labor taxable on repair/maintenance (not new construction)' },
  'Utah':           { matTax: 6.1,    laborTax: 0,   laborNote: '' },
  'Vermont':        { matTax: 6.0,    laborTax: 0,   laborNote: '' },
  'Virginia':       { matTax: 5.3,    laborTax: 0,   laborNote: '' },
  'Washington':     { matTax: 6.5,    laborTax: 6.5, laborNote: 'Labor on tangible personal property installation taxable' },
  'West Virginia':  { matTax: 6.0,    laborTax: 6.0, laborNote: 'Labor on construction services is taxable' },
  'Wisconsin':      { matTax: 5.0,    laborTax: 0,   laborNote: '' },
  'Wyoming':        { matTax: 4.0,    laborTax: 0,   laborNote: '' },
  'Washington D.C.':{ matTax: 6.0,    laborTax: 0,   laborNote: '' },
};

// Get tax rates for a state — uses contractor's custom overrides if set, else defaults
const getStateTax = (stateName, customRates) => {
  if (!stateName) return { matTax: 0, laborTax: 0, laborNote: '' };
  const key = Object.keys(STATE_TAX_DEFAULTS).find(k =>
    stateName.toLowerCase().includes(k.toLowerCase())
  );
  const defaults = key ? STATE_TAX_DEFAULTS[key] : { matTax: 0, laborTax: 0, laborNote: '' };
  if (!customRates || !key) return defaults;
  return {
    matTax:    customRates[key]?.matTax    ?? defaults.matTax,
    laborTax:  customRates[key]?.laborTax  ?? defaults.laborTax,
    laborNote: defaults.laborNote,
  };
};

const laborTaxable = (state, customRates) => {
  const rates = getStateTax(state, customRates);
  return rates.laborTax > 0;
};

const calcInvoice = (inv, userState, customTaxRates) => {
  const laborT = (inv.labor    ||[]).reduce((s,r)=>s+r.hrs *r.rate,0);
  const matsT  = (inv.materials||[]).reduce((s,r)=>s+r.qty *r.cost,0);
  const equipT = (inv.equipment||[]).reduce((s,r)=>s+r.qty *r.rate,0);
  const mkBase = matsT + equipT;
  const mkAmt  = mkBase*(inv.markup||0)/100;
  const stateTax = getStateTax(userState, customTaxRates);
  // Use invoice's tax field, but apply to correct base based on state rules
  const taxRate = inv.tax != null ? inv.tax : stateTax.matTax;
  const taxableBase = matsT + equipT + mkAmt + (stateTax.laborTax > 0 ? laborT : 0);
  const txAmt  = taxableBase*(taxRate/100);
  const sub    = laborT + matsT + equipT;
  const total  = sub + mkAmt + txAmt;
  const paid   = (inv.payments||[]).reduce((s,p)=>s+p.amount,0);
  const balance = Math.max(0, total - paid);
  return { laborT, matsT, equipT, sub, mkAmt, txAmt, total, paid, balance };
};

// A/R Aging buckets — mirrors QuickBooks
const agingBucket = (inv) => {
  if (inv.status==='paid'||inv.status==='draft'||inv.status==='void') return null;
  const today2 = today();
  if (inv.dueAt >= today2) return 'current';
  const days = daysDiff(inv.dueAt, today2);
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
};

const SEED_INVOICES = [];

// ── Status Badge ───────────────────────────────────────────────────────────────
function InvBadge({ status }) {
  const meta = INV_STATUS[status] || INV_STATUS.draft;
  const { label, bg, color, filled } = meta;
  return <span style={{
    fontSize: 12, fontWeight: filled ? 800 : 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '4px 11px', borderRadius: 5,
    background: bg, color,
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap', display: 'inline-block',
    border: filled ? 'none' : `1px solid ${color}1a`,
    boxShadow: filled ? `0 1px 2px ${bg}66` : 'none',
  }}>{label}</span>;
}


// Tablet-responsive aging grid (3+2 on tablet, 5 across on laptop)
function AgingGrid({ buckets, totals, labels, colors, onFilter }) {
  const { isTablet } = useBreakpoint();
  return (
    <div style={{ display:'grid', gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : `repeat(${buckets.length}, 1fr)` }}>
      {buckets.map((b, i) => (
        <button key={b} onClick={()=>onFilter(b)} style={{
          background:'transparent', border:'none',
          borderRight: i < buckets.length-1 ? `1px solid ${C.border}` : 'none',
          borderBottom: isTablet && i < 3 ? `1px solid ${C.border}` : 'none',
          padding: isTablet ? '12px 8px' : '14px 12px',
          cursor:'pointer', textAlign:'center', WebkitTapHighlightColor:'transparent',
        }}>
          <div style={{ fontFamily:"'Inter', sans-serif", fontSize: isTablet ? 17 : 18, fontWeight:900, color: totals[b].amount > 0 ? colors[b] : C.dim, lineHeight:1, marginBottom:4 }}>
            {fmtMoney(totals[b].amount)}
          </div>
          <div style={{ fontSize: isTablet ? 12 : 13, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>{labels[b]}</div>
          {totals[b].count > 0 && <div style={{ fontSize:12, color:C.dim, marginTop:3 }}>{totals[b].count} inv.</div>}
        </button>
      ))}
    </div>
  );
}

// ── A/R Aging Panel ────────────────────────────────────────────────────────────
function AgingReport({ invoices, onFilter }) {
  const buckets = ['current','1-30','31-60','61-90','90+'];
  const labels  = { current:'Current', '1-30':'1–30 Days', '31-60':'31–60 Days', '61-90':'61–90 Days', '90+':'90+ Days' };
  const colors  = { current: C.success, '1-30':'#d97706', '31-60':'#ea580c', '61-90':'#dc2626', '90+':'#7f1d1d' };

  const totals = {};
  buckets.forEach(b => { totals[b] = { count:0, amount:0 }; });
  invoices.forEach(inv => {
    const b = agingBucket(inv);
    if (!b) return;
    const calc = calcInvoice(inv);
    totals[b].count++;
    totals[b].amount += calc.balance;
  });

  const grandTotal = Object.values(totals).reduce((s,b)=>s+b.amount,0);

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', color:C.muted }}>A/R Aging Summary</div>
        <div style={{ fontFamily:"'Inter', sans-serif", fontSize:19, fontWeight:900, color:C.text }}>
          {fmtMoney(grandTotal)} <span style={{ fontSize:14, fontWeight:400, color:C.muted }}>total outstanding</span>
        </div>
      </div>
      <AgingGrid buckets={buckets} totals={totals} labels={labels} colors={colors} onFilter={onFilter} />
    </div>
  );
}

// ── Record Payment Modal ───────────────────────────────────────────────────────
function RecordPaymentModal({ invoice, onSave, onClose }) {
  const calc = calcInvoice(invoice);
  const [amount,  setAmount]  = useState(calc.balance.toFixed(2));
  const [date,    setDate]    = useState(today());
  const [method,  setMethod]  = useState('Card');
  const [ref,     setRef]     = useState('');

  const METHODS = ['Card','ACH / Bank Transfer','Check','Cash','Venmo','Cash App','Zelle'];

  const handleSave = () => {
    const payment = { id: Math.random().toString(36).slice(2,9), date, amount: parseFloat(amount), method, ref };
    const newPaid = calc.paid + parseFloat(amount);
    const newBalance = Math.max(0, calc.total - newPaid);
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';
    const note = `Payment received — ${fmtMoney(parseFloat(amount))} via ${method}${ref ? ` #${ref}` : ''}`;
    onSave({
      ...invoice,
      payments: [...(invoice.payments||[]), payment],
      status: newStatus,
      paidAt: newStatus==='paid' ? date : invoice.paidAt,
      activity: [...(invoice.activity||[]), { date, type:'payment', note }],
    });
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#00000066', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border2}`, borderRadius:4, padding:'28px 26px', width:'100%', maxWidth:440 }}>
        <div style={{ fontFamily:"'Inter', sans-serif", fontSize:24, fontWeight:900, color:C.text, marginBottom:4, textTransform:'uppercase' }}>Record Payment</div>
        <div style={{ fontSize:16, color:C.muted, marginBottom:22 }}>{invoice.number} — {invoice.clientName}</div>

        <div style={{ background:C.raised, border:`1px solid ${C.border}`, borderRadius:3, padding:'12px 16px', marginBottom:20, display:'flex', gap:8, flexWrap:'wrap', justifyContent:'space-between' }}>
          {[['Invoice Total', fmtMoney(calc.total), C.text], ['Paid to Date', fmtMoney(calc.paid), C.success], ['Balance Due', fmtMoney(calc.balance), calc.balance>0 ? C.error : C.success]].map(([l,v,c])=>(
            <div key={l} style={{ flex:'1 1 80px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:900, color:c }}>{v}</div>
              <div style={{ fontSize:13, color:C.muted, marginTop:3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={s.label}>Payment Amount</label>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} min={0} step={0.01}
              style={{ ...s.input, width:'100%', padding:'12px 14px', boxSizing:'border-box', fontSize:20, minHeight:52, fontWeight:700 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={s.label}>Payment Date</label>
              <CalendarPicker value={date} onChange={setDate} />
            </div>
            <div>
              <label style={s.label}>Method</label>
              <select value={method} onChange={e=>setMethod(e.target.value)}
                style={{ ...s.input, width:'100%', padding:'11px 12px', minHeight:48, cursor:'pointer' }}>
                {METHODS.map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={s.label}>Reference / Check # <span style={{ color:C.dim, fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
            <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="e.g. CHK-1042 or transaction ID"
              style={{ ...s.input, width:'100%', padding:'11px 14px', boxSizing:'border-box', fontSize:17, minHeight:48 }} />
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:24, justifyContent:'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!parseFloat(amount)}>Save Payment</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Hub ────────────────────────────────────────────────────────────────
function InvoiceHub({ invoices, onSelect, onNew }) {
  const { isTablet } = useBreakpoint();
  const [filter,  setFilter]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [sortBy,  setSortBy]  = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [agingFilter, setAgingFilter] = useState(null);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d==='asc'?'desc':'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };
  const SortArrow = ({ col }) => sortBy===col ? (sortDir==='asc'?'  ↑':'  ↓') : '';

  const FILTERS = ['all','draft','sent','viewed','partial','paid','overdue','void'];

  const visible = invoices
    .filter(inv => {
      if (filter !== 'all' && inv.status !== filter) return false;
      if (agingFilter && agingBucket(inv) !== agingFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!inv.title.toLowerCase().includes(q) && !inv.clientName.toLowerCase().includes(q) && !inv.number.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a,b) => {
      let av = a[sortBy] ?? '', bv = b[sortBy] ?? '';
      if (sortBy === 'balance') { av = calcInvoice(a).balance; bv = calcInvoice(b).balance; }
      if (sortBy === 'total')   { av = calcInvoice(a).total;   bv = calcInvoice(b).total;   }
      if (av < bv) return sortDir==='asc' ? -1 :  1;
      if (av > bv) return sortDir==='asc' ?  1 : -1;
      return 0;
    });

  // Money In summary — mirrors QuickBooks dashboard
  const open    = invoices.filter(i=>i.status==='sent'||i.status==='viewed').reduce((s,i)=>s+calcInvoice(i).balance,0);
  const overdue = invoices.filter(i=>i.status==='overdue').reduce((s,i)=>s+calcInvoice(i).balance,0);
  const partial = invoices.filter(i=>i.status==='partial').reduce((s,i)=>s+calcInvoice(i).balance,0);
  const paidMo  = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+calcInvoice(i).paid,0);

  const TH = ({ label, col, right }) => (
    <th onClick={()=>col&&handleSort(col)} style={{ padding:'11px 14px', textAlign:right?'right':'left', fontSize:14, fontWeight:900, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'Inter', sans-serif", whiteSpace:'nowrap', cursor:col?'pointer':'default', borderBottom:`1.5px solid ${C.border2}`, background:C.raised, userSelect:'none' }}>
      {label}{col && <SortArrow col={col} />}
    </th>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:20, paddingBottom:18, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontFamily:"'Inter', sans-serif", fontSize:28, fontWeight:700, color:C.text, letterSpacing:'-0.025em' }}>Invoices</h1>
          <p style={{ margin:'6px 0 0', fontSize:15, color:C.muted, fontWeight:500 }}>{invoices.length} total</p>
        </div>
        <Btn variant="primary" onClick={onNew} style={{ fontSize:21, padding:'12px 22px', minHeight:52 }}>New Invoice</Btn>
      </div>

      {/* Money In summary — same bold treatment as Dashboard StatCard:
          gradient wash + 4px accent stripe + hover lift. No more blue. */}
      <div style={{ display:'grid', gridTemplateColumns:isTablet?'1fr 1fr':'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Open',    val:fmtMoney(open),    color:C.accent,    sub:'Sent & viewed'    },  // orange (was blue)
          { label:'Overdue', val:fmtMoney(overdue), color:C.errorBold, sub:'Past due date'    },  // bold red
          { label:'Partial', val:fmtMoney(partial), color:C.warn,      sub:'Balance remaining'},  // gold
          { label:'Paid',    val:fmtMoney(paidMo),  color:C.success,   sub:'Collected'        },  // green
        ].map(c => (
          <div key={c.label} style={{
            background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface} 55%, ${c.color}0d 100%)`,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: C.shadow1,
            transition: 'box-shadow 0.2s, transform 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = C.shadow2; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = C.shadow1; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ height: 4, background: `linear-gradient(90deg, ${c.color} 0%, ${c.color} 60%, ${c.color}88 100%)` }} />
            <div style={{ padding: '16px 18px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 10, fontWeight: 500 }}>{c.sub}</div>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize: 36, fontWeight: 800, color: c.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{c.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* A/R Aging — click a bucket to filter */}
      <AgingReport invoices={invoices} onFilter={b => { setAgingFilter(agingFilter===b?null:b); setFilter('all'); }} />
      {agingFilter && (
        <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16, color:C.muted }}>Filtering by aging: <strong style={{ color:C.orange }}>{agingFilter==='current'?'Current':agingFilter+' days past due'}</strong></span>
          <button onClick={()=>setAgingFilter(null)} style={{ ...s.btn, background:'transparent', border:`1px solid ${C.border2}`, color:C.muted, padding:'4px 10px', fontSize:14, minHeight:32 }}>Clear</button>
        </div>
      )}

      {/* Search + Status filter */}
      <div style={{ display:'flex', gap:10, marginBottom:12, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by client, title, or invoice #..."
          style={{ ...s.input, flex:1, minWidth:180, padding:'10px 14px', fontSize:17 }} />
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', flexWrap:'nowrap', paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
        {FILTERS.map(f => {
          const count = f==='all' ? invoices.length : invoices.filter(i=>i.status===f).length;
          return (
            <button key={f} onClick={()=>{setFilter(f);setAgingFilter(null);}} style={{ ...s.btn, padding:'7px 14px', fontSize:14, minHeight:40, background:filter===f?C.orange:C.raised, border:`1.5px solid ${filter===f?C.orange:C.border2}`, color:filter===f?'#fff':C.muted }}>
              {f.charAt(0).toUpperCase()+f.slice(1)} {count>0 && <span style={{ opacity:0.7 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Invoice table — sortable columns like QB */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden', overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:isTablet?600:800 }}>
          <thead>
            <tr>
              <TH label="Status"   />
              <TH label="Invoice #"    col="number"    />
              <TH label="Client"       col="clientName"/>
              <TH label="Title"        col="title"     />
              <TH label="Date"         col="createdAt" />
              <TH label="Due"          col="dueAt"     right />
              <TH label="Terms"        col="terms"     />
              <TH label="Total"        col="total"     right />
              <TH label="Balance Due"  col="balance"   right />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={9} style={{ padding:'32px 20px', textAlign:'center', fontSize:18, color:C.dim }}>No invoices match this filter.</td></tr>
            )}
            {visible.map((inv, i) => {
              const calc = calcInvoice(inv);
              const isOverdue = inv.status==='overdue';
              return (
                <tr key={inv.id} onClick={()=>onSelect(inv.id)} style={{ borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:i%2===0?'#fff':'#fafafa' }}
                  onPointerEnter={e=>e.currentTarget.style.background='#fff7ed'}
                  onPointerLeave={e=>e.currentTarget.style.background=i%2===0?'#fff':'#fafafa'}
                >
                  <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}><InvBadge status={inv.status} /></td>
                  <td style={{ padding:'12px 14px', fontFamily:"'Inter', sans-serif", fontSize:16, fontWeight:800, color:C.orange, letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{inv.number}</td>
                  <td style={{ padding:'12px 14px', fontSize:16, color:C.text, whiteSpace:'nowrap' }}>{inv.clientName}</td>
                  <td style={{ padding:'12px 14px', fontSize:16, color:C.muted, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.title}</td>
                  <td style={{ padding:'12px 14px', fontSize:15, color:C.muted, whiteSpace:'nowrap' }}>{inv.createdAt}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontSize:15, color:isOverdue?C.error:C.muted, fontWeight:isOverdue?700:400, whiteSpace:'nowrap' }}>{inv.dueAt}</td>
                  <td style={{ padding:'12px 14px', fontSize:15, color:C.muted, whiteSpace:'nowrap' }}>{inv.terms||'Net 30'}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>{fmtMoney(calc.total)}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, color:calc.balance>0?(isOverdue?C.error:C.text):C.success, whiteSpace:'nowrap' }}>
                    {calc.balance>0 ? fmtMoney(calc.balance) : 'PAID'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {visible.length > 0 && (
        <div style={{ marginTop:10, padding:'10px 14px', background:C.raised, border:`1px solid ${C.border}`, borderRadius:3, display:'flex', justifyContent:'space-between', fontSize:15, color:C.muted }}>
          <span>{visible.length} invoice{visible.length!==1?'s':''}</span>
          <span>Balance Due Total: <strong style={{ color:C.text }}>{fmtMoney(visible.reduce((s,i)=>s+calcInvoice(i).balance,0))}</strong></span>
        </div>
      )}
    </div>
  );
}

// ── Invoice Editor ─────────────────────────────────────────────────────────────
function InvoiceEditor({ initial, user, onSave, onCancel }) {
  const { isTablet } = useBreakpoint();
  const tradeConf = getTradeConfig(user?.trades?.[0], user?.trades);
  const uid2 = () => Math.random().toString(36).slice(2,9);

  const [number]    = useState(initial?.number || nextInvNum());
  const [title,     setTitle]     = useState(initial?.title     || '');
  const [clientName,setClientName]= useState(initial?.clientName|| '');
  const [clientEmail,setClientEmail]=useState(initial?.clientEmail||'');
  const [clientPhone,setClientPhone]=useState(initial?.clientPhone||'');
  const [clientAddr, setClientAddr]=useState(initial?.clientAddress||'');
  const [trade,     setTrade]     = useState(initial?.trade     || user?.trades?.[0] || 'Plumber');
  const [createdAt] = useState(initial?.createdAt || today());
  const [terms,     setTerms]     = useState(initial?.terms || 'Net 30');
  const [dueAt,     setDueAt]     = useState(initial?.dueAt || addDays(today(), 30));
  const [notes,     setNotes]     = useState(initial?.notes     || '');
  const [markup,    setMarkup]    = useState(initial?.markup    ?? 15);
  const [taxRate,   setTaxRate]   = useState(initial?.tax       ?? 8.5);
  const [labor,     setLabor]     = useState(initial?.labor     || [{ id:uid2(), desc:'', hrs:0, rate:tradeConf.defaultLaborRate }]);
  const [materials, setMaterials] = useState(initial?.materials || []);
  const [equipment, setEquipment] = useState(initial?.equipment || []);
  const [tab,       setTab]       = useState('labor');
  const [selMat,    setSelMat]    = useState(null);

  const handleTermsChange = (newTerms) => {
    setTerms(newTerms);
    const t = PAYMENT_TERMS.find(t=>t.label===newTerms);
    if (t) setDueAt(addDays(createdAt, t.days));
  };

  const addRow    = (setter, tmpl) => setter(a=>[...a, { ...tmpl, id:uid2() }]);
  const updRow    = (setter,id,key,val)=>setter(a=>a.map(r=>r.id===id?{...r,[key]:val}:r));
  const delRow    = (setter,id)=>setter(a=>a.filter(r=>r.id!==id));

  const calc = calcInvoice({ labor, materials, equipment, markup, tax:taxRate }, user?.state);

  const handleSave = (asDraft) => {
    const activity = initial?.activity || [{ date: createdAt, type:'created', note:'Invoice created' }];
    onSave({
      ...(initial||{}), id: initial?.id || uid2(),
      number, title, clientName, clientEmail, clientPhone, clientAddress:clientAddr,
      trade, createdAt, terms, dueAt, notes, markup, tax:taxRate,
      labor, materials, equipment,
      payments: initial?.payments || [],
      activity,
      status: asDraft ? 'draft' : (initial?.status || 'draft'),
    });
  };

  const TABS = [
    { id:'labor',     label:'Labor',     short:'Labor'  },
    { id:'materials', label:'Materials', short:'Matls'  },
    { id:'equipment', label:'Equipment', short:'Equip'  },
    { id:'notes',     label:'Notes',     short:'Notes'  },
  ];

  const NI = (val,onChange,w=76) => (
    <input
      type="number"
      value={val === 0 || val === undefined || val === null ? '' : val}
      onChange={e => onChange(e.target.value === '' ? 0 : +e.target.value)}
      onFocus={e => e.target.select()}
      min={0}
      step="0.01"
      inputMode="decimal"
      placeholder="0"
      style={{ ...s.input, width:w, padding:'9px 8px', textAlign:'right', boxSizing:'border-box', minHeight:44 }}
    />
  );
  const TI = (val,onChange) => (
    <input type="text" value={val} onChange={e=>onChange(e.target.value)}
      style={{ ...s.input, width:'100%', padding:'9px 10px', boxSizing:'border-box', minHeight:44 }} />
  );
  const TH = ({ children, right }) => (
    <th style={{ padding:'10px 8px', textAlign:right?'right':'left', fontSize:16, fontWeight:900, color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"'Inter', sans-serif", borderBottom:`1.5px solid ${C.border2}`, background:C.raised, whiteSpace:'nowrap' }}>{children}</th>
  );
  const TC = ({ val }) => (
    <td style={{ padding:'8px', textAlign:'right', fontSize:18, fontWeight:700, color:val>0?C.text:C.dim, fontFamily:"'Inter', sans-serif" }}>{fmtMoney(val)}</td>
  );
  const DelX = ({ onClick }) => (
    <button onClick={onClick} style={{ ...s.btn, background:'transparent', border:`1px solid ${C.border2}`, color:C.error, padding:'6px 10px', fontSize:15, minHeight:44, minWidth:44 }}>Remove</button>
  );

  const tradeColor = getTradeConfig(trade, user?.trades)?.color || C.orange;

  return (
    <div>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Btn variant="ghost" size="sm" onClick={onCancel} style={{ fontSize:21, padding:'12px 24px', minHeight:52 }}>Cancel</Btn>
          <span style={{ fontFamily:"'Inter', sans-serif", fontSize:18, fontWeight:700, color:C.text, letterSpacing:'-0.02em' }}>
            {initial ? `Edit ${initial.number}` : 'New Invoice'}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost"   size="sm" onClick={()=>handleSave(true)}  style={{ fontSize:21, padding:'12px 24px', minHeight:52 }}>Save Draft</Btn>
          <Btn variant="primary" size="sm" onClick={()=>handleSave(false)} style={{ fontSize:21, padding:'12px 24px', minHeight:52 }}>Save + Preview</Btn>
        </div>
      </div>

      {/* Client + job info */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'20px 22px', marginBottom:16 }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.muted, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14, fontFamily:"'Inter', sans-serif" }}>Invoice Details</div>
        <div style={{ display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 1fr', gap:14 }}>
          <div>
            <label style={s.label}>Job Title <span style={{ color:C.orange }}>*</span></label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Kitchen Shut-Off Valve Replacement"
              style={{ ...s.input, width:'100%', padding:'12px 14px', boxSizing:'border-box', fontSize:18, minHeight:48 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={s.label}>Payment Terms</label>
              <select value={terms} onChange={e=>handleTermsChange(e.target.value)}
                style={{ ...s.input, width:'100%', padding:'12px 14px', boxSizing:'border-box', fontSize:17, minHeight:48, cursor:'pointer', borderColor:C.orange+'66' }}>
                {PAYMENT_TERMS.map(t=><option key={t.label}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <CalendarPicker label="Invoice Date" value={createdAt} onChange={()=>{}} />
            </div>
            <div>
              <CalendarPicker label="Due Date" value={dueAt} onChange={setDueAt} />
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 1fr 1fr 1fr', gap:12, marginTop:14 }}>
          <div>
            <label style={s.label}>Client Name</label>
            <input value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Sandra Johnson"
              style={{ ...s.input, width:'100%', padding:'11px 12px', boxSizing:'border-box', fontSize:18, minHeight:48 }} />
          </div>
          <div>
            <label style={s.label}>Email</label>
            <input type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="client@email.com"
              style={{ ...s.input, width:'100%', padding:'11px 12px', boxSizing:'border-box', fontSize:18, minHeight:48 }} />
          </div>
          <div>
            <label style={s.label}>Phone</label>
            <input type="tel" value={clientPhone} onChange={e=>setClientPhone(e.target.value)} placeholder="(512) 555-0000"
              style={{ ...s.input, width:'100%', padding:'11px 12px', boxSizing:'border-box', fontSize:18, minHeight:48 }} />
          </div>
          <div>
            <label style={s.label}>Address</label>
            <input value={clientAddr} onChange={e=>setClientAddr(e.target.value)} placeholder="123 Main St, Austin TX"
              style={{ ...s.input, width:'100%', padding:'11px 12px', boxSizing:'border-box', fontSize:18, minHeight:48 }} />
          </div>
        </div>
        {user?.trades?.length > 1 && (
          <div style={{ marginTop:14, maxWidth:220 }}>
            <label style={s.label}>Trade</label>
            <select value={trade} onChange={e=>setTrade(e.target.value)}
              style={{ ...s.input, width:'100%', padding:'11px 12px', minHeight:48, cursor:'pointer', borderColor:tradeColor+'88' }}>
              {user.trades.map(t => <option key={t} value={t}>{t==='Specialty'?'Specialty Trades':t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Line items + summary side by side */}
      <div style={{ display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 280px', gap:16, alignItems:'start' }}>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden' }}>
          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
            {TABS.map(({ id, label, short }) => {
              const active = tab === id;
              return (
                <button key={id} onClick={()=>setTab(id)} style={{
                  flex:1, padding:isTablet?'18px 12px':'16px 20px', whiteSpace:'nowrap',
                  background:active?C.raised:'transparent',
                  border:'none', borderBottom:`3px solid ${active?C.orange:'transparent'}`,
                  color:active?C.text:C.muted, cursor:'pointer',
                  fontFamily:"'Inter', sans-serif",
                  fontSize:isTablet?16:18, fontWeight:800,
                  letterSpacing:'0.07em', textTransform:'uppercase', minHeight:62,
                  WebkitTapHighlightColor:'transparent',
                }}>
                  {isTablet ? short : label}
                </button>
              );
            })}
          </div>

          <div style={{ padding:'16px 18px' }}>
            {/* Labor tab */}
            {tab==='labor' && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:420 }}>
                  <thead><tr><TH>Description</TH><TH right>Hrs</TH><TH right>Rate</TH><TH right>Total</TH><TH /></tr></thead>
                  <tbody>
                    {labor.map(r => (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'5px 5px' }}>{TI(r.desc, v=>updRow(setLabor,r.id,'desc',v))}</td>
                        <td style={{ padding:'5px 5px', width:70  }}>{NI(r.hrs,  v=>updRow(setLabor,r.id,'hrs', v),70)}</td>
                        <td style={{ padding:'5px 5px', width:90  }}>{NI(r.rate, v=>updRow(setLabor,r.id,'rate',v),90)}</td>
                        <TC val={r.hrs*r.rate} />
                        <td style={{ padding:'5px 2px', width:70 }}><DelX onClick={()=>delRow(setLabor,r.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Btn variant="ghost" size="sm" style={{ marginTop:10 }} onClick={()=>addRow(setLabor,{ desc:'', hrs:0, rate:tradeConf.defaultLaborRate||100 })}>Add Labor Row</Btn>
              </div>
            )}

            {/* Materials tab */}
            {tab==='materials' && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
                  <thead><tr><TH>Description</TH><TH right>Qty</TH><TH right>Unit</TH><TH right>Cost</TH><TH right>Total</TH><TH /></tr></thead>
                  <tbody>
                    {materials.map(r => (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'5px 5px' }}>{TI(r.desc,v=>updRow(setMaterials,r.id,'desc',v))}</td>
                        <td style={{ padding:'5px 5px', width:60  }}>{NI(r.qty, v=>updRow(setMaterials,r.id,'qty', v),60)}</td>
                        <td style={{ padding:'5px 5px', width:80 }}>
                          <select value={r.unit} onChange={e=>updRow(setMaterials,r.id,'unit',e.target.value)}
                            style={{ ...s.input, width:80, padding:'9px 5px', minHeight:44 }}>
                            {['ea','ft','lf','sf','lb','gal','box','roll','lot','set'].map(u=><option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:'5px 5px', width:90  }}>{NI(r.cost,v=>updRow(setMaterials,r.id,'cost',v),90)}</td>
                        <TC val={r.qty*r.cost} />
                        <td style={{ padding:'5px 2px', width:70 }}><DelX onClick={()=>delRow(setMaterials,r.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Btn variant="ghost" size="sm" style={{ marginTop:10 }} onClick={()=>addRow(setMaterials,{ desc:'', qty:1, unit:'ea', cost:0 })}>Add Material Row</Btn>
              </div>
            )}

            {/* Equipment tab */}
            {tab==='equipment' && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
                  <thead><tr><TH>Description</TH><TH right>Qty</TH><TH right>Unit</TH><TH right>Rate</TH><TH right>Total</TH><TH /></tr></thead>
                  <tbody>
                    {equipment.map(r => (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'5px 5px' }}>{TI(r.desc,v=>updRow(setEquipment,r.id,'desc',v))}</td>
                        <td style={{ padding:'5px 5px', width:60  }}>{NI(r.qty, v=>updRow(setEquipment,r.id,'qty', v),60)}</td>
                        <td style={{ padding:'5px 5px', width:78 }}>
                          <select value={r.unit} onChange={e=>updRow(setEquipment,r.id,'unit',e.target.value)}
                            style={{ ...s.input, width:78, padding:'9px 5px', minHeight:44, cursor:'pointer' }}>
                            {['hr','day','week','month'].map(u=><option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:'5px 5px', width:90  }}>{NI(r.rate,v=>updRow(setEquipment,r.id,'rate',v),90)}</td>
                        <TC val={r.qty*r.rate} />
                        <td style={{ padding:'5px 2px', width:70 }}><DelX onClick={()=>delRow(setEquipment,r.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Btn variant="ghost" size="sm" style={{ marginTop:10 }} onClick={()=>addRow(setEquipment,{ desc:'', qty:1, unit:'day', rate:0 })}>Add Equipment Row</Btn>
              </div>
            )}

            {/* Notes tab */}
            {tab==='notes' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <div>
                    <label style={s.label}>Markup %</label>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="number" value={markup} onChange={e=>setMarkup(+e.target.value)} min={0} max={100}
                        style={{ ...s.input, width:120, padding:'12px 14px', fontSize:22, fontWeight:700, color:C.text, minHeight:52 }} />
                      <span style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:800, color:C.muted }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={s.label}>Tax Rate %</label>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input type="number" value={taxRate} onChange={e=>setTaxRate(+e.target.value)} min={0} max={30} step={0.1}
                        style={{ ...s.input, width:120, padding:'12px 14px', fontSize:22, fontWeight:700, color:C.text, minHeight:52 }} />
                      <span style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:800, color:C.muted }}>%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={s.label}>Notes to Client</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5}
                    placeholder="Payment terms, warranty info, next steps..."
                    style={{ ...s.input, width:'100%', padding:'12px 14px', boxSizing:'border-box', resize:'vertical', lineHeight:1.65, fontSize:18 }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary panel */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden', position:isTablet?'static':'sticky', top:24 }}>
          <div style={{ padding:'18px 18px 0' }}>
            <div style={{ fontSize:15, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted, marginBottom:12, fontFamily:"'Inter', sans-serif" }}>Summary</div>
            {[['Labor',calc.laborT],['Materials',calc.matsT],['Equipment',calc.equipT]].map(([lbl,val])=>(
              <div key={lbl} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:18, color:C.muted }}>{lbl}</span>
                <span style={{ fontSize:19, fontWeight:700, fontFamily:"'Inter', sans-serif", color:val>0?C.text:C.dim }}>{fmtMoney(val)}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:17, color:C.muted }}>Markup ({markup}%) <span style={{ fontSize:13, color:C.dim }}>mat+equip</span></span>
              <span style={{ fontSize:18, color:C.muted }}>{fmtMoney(calc.mkAmt)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:17, color:C.muted }}>
                Tax ({taxRate}%)
                {laborTaxable(user?.state) && <span style={{ fontSize:12, color:C.warn, marginLeft:6, fontWeight:700 }}>incl. labor ({user?.state?.split(',')[0]})</span>}
              </span>
              <span style={{ fontSize:18, color:C.muted }}>{fmtMoney(calc.txAmt)}</span>
            </div>
          </div>
          <div style={{ margin:'0 18px 18px', marginTop:0, background:C.orange, borderRadius:'0 0 3px 3px', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#fff' }}>Total Due</span>
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>{fmtMoney(calc.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Invoice Document ───────────────────────────────────────────────────────────
function InvoiceDocument({ invoice, user, logo, payments, onEdit, onBack, onRecordPayment, onVoid, onSendReminder }) {
  const { isTablet } = useBreakpoint();
  const calc = calcInvoice(invoice, user?.state);
  const tradeConf = getTradeConfig(invoice.trade, user?.trades);
  // Accent color: user custom > trade default
  const accentColor = user?.accentColor || tradeConf.color;
  const accentStripe = user?.accentColor
    ? `linear-gradient(90deg, ${user.accentColor}, ${user.accentColor}cc)`
    : tradeConf.stripe;
  const pad = isTablet ? '20px 18px' : '32px 44px';
  const isVoid = invoice.status === 'void';
  const isPaid = invoice.status === 'paid';
  const isOverdue = invoice.status === 'overdue';

  return (
    <div>
      {/* Action bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <Btn variant="ghost" size="sm" onClick={onBack} style={{ fontSize:18, padding:'10px 18px', minHeight:48 }}>Back</Btn>
        <span style={{ fontFamily:"'Inter', sans-serif", fontSize:26, fontWeight:800, color:C.orange, letterSpacing:'0.08em' }}>{invoice.number}</span>
        <InvBadge status={invoice.status} />
        {calc.balance > 0.01 && !isVoid && (
          <span style={{ fontFamily:"'Inter', sans-serif", fontSize:18, fontWeight:900, color:isOverdue?C.error:C.text }}>Balance: {fmtMoney(calc.balance)}</span>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
          {!isVoid && !isPaid && <Btn variant="ghost" size="sm" onClick={onEdit} style={{ fontSize:18, padding:'10px 18px', minHeight:48 }}>Edit</Btn>}
          <Btn variant="ghost" size="sm" style={{ fontSize:18, padding:'10px 18px', minHeight:48 }}>Download PDF</Btn>
          {!isVoid && !isPaid && <Btn variant="ghost" size="sm" style={{ fontSize:18, padding:'10px 18px', minHeight:48 }}>Send</Btn>}
          {isOverdue && <Btn variant="ghost" size="sm" onClick={onSendReminder} style={{ fontSize:18, padding:'10px 18px', minHeight:48, color:C.warn, borderColor:C.warn+'66' }}>Send Reminder</Btn>}
          {!isVoid && !isPaid && calc.balance > 0 && (
            <Btn variant="primary" size="sm" onClick={onRecordPayment} style={{ fontSize:18, padding:'10px 18px', minHeight:48 }}>Record Payment</Btn>
          )}
          {!isVoid && !isPaid && (
            <Btn variant="ghost" size="sm" onClick={onVoid} style={{ fontSize:18, padding:'10px 18px', minHeight:48, color:C.error, borderColor:C.error+'44' }}>Void</Btn>
          )}
        </div>
      </div>

      {/* White document */}
      <div style={{ background:'#fff', borderRadius:4, boxShadow:'0 6px 50px #00000033', overflow:'hidden', fontFamily:"'Inter', sans-serif" }}>
        <div style={{ height:6, background:accentStripe }} />

        {/* Header */}
        <div style={{ padding:pad, display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 1fr', gap:20, borderBottom:'1.5px solid #ebebeb' }}>
          <div>
            {/* Logo */}
            <div style={{ marginBottom:14, minHeight:52 }}>
              {logo
                ? <img src={logo} alt="Company logo" style={{ maxHeight:80, maxWidth:isTablet?160:240, objectFit:'contain', display:'block' }} />
                : <img src={TRADEVOICE_LOGO} alt="Tradevoice" style={{ maxHeight:70, maxWidth:isTablet?180:260, objectFit:'contain', display:'block' }} />
              }
            </div>
            {/* Trade badge */}
            <div style={{ marginBottom:8 }}>
              <span style={{ display:'inline-block', fontSize:15, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', borderRadius:2, background:accentColor, color:'#fff', fontFamily:"'Inter', sans-serif" }}>
                {tradeConf.docLabel}
              </span>
            </div>
            <div style={{ fontSize:19, fontWeight:700, color:'#222', marginBottom:2 }}>{user?.company || user?.name}</div>
            {user?.tagline && <div style={{ fontSize:14, color:accentColor, fontWeight:600, marginBottom:4 }}>{user.tagline}</div>}
            <div style={{ fontSize:17, color:'#777', lineHeight:1.9 }}>
              {user?.email && <div>{user.email}</div>}
              {user?.phone && <div>{user.phone}</div>}
              {(user?.states?.length>1 ? user.states.join(', ') : user?.state) && <div>{user?.states?.length>1 ? user.states.join(', ') : user?.state}</div>}
            </div>
            {(user?.license || tradeConf.licenseNote) && (
              <div style={{ marginTop:6, fontSize:15, color:'#888', fontStyle:'italic' }}>{user?.license || tradeConf.licenseNote}</div>
            )}
          </div>

          <div style={{ textAlign:isTablet?'left':'right', marginTop:isTablet?16:0, display:'flex', flexDirection:'column', alignItems:isTablet?'flex-start':'flex-end' }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize:isTablet?34:46, fontWeight:900, color:'#111', letterSpacing:'0.04em', lineHeight:1 }}>INVOICE</div>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize:30, fontWeight:900, color:accentColor, letterSpacing:'0.1em', marginTop:4 }}>{invoice.number}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'6px 18px' }}>
              {[
                ['Date',   invoice.createdAt || '—'],
                ['Due',    invoice.dueAt     || 'Net 30'],
                ['Status', (INV_STATUS[invoice.status]?.label || 'Draft').toUpperCase()],
              ].map(([label, val]) => (
                <>
                  <span key={label+'-l'} style={{ fontSize:16, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.09em', color:'#bbb', paddingTop:2, whiteSpace:'nowrap' }}>{label}</span>
                  <span key={label+'-v'} style={{ fontSize:17, fontWeight:600, color: invoice.status==='paid' ? C.success : invoice.status==='overdue' ? C.error : '#222' }}>{val}</span>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Bill To + Job */}
        <div style={{ padding:isTablet?'16px 18px':'20px 44px', display:'grid', gridTemplateColumns:isTablet?'1fr':'1fr 1fr', gap:20, background:'#f9f9f9', borderBottom:'1.5px solid #ebebeb' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.12em', color:'#bbb', marginBottom:6, fontFamily:"'Inter', sans-serif" }}>Bill To</div>
            <div style={{ fontSize:20, fontWeight:700, color:'#111' }}>{invoice.clientName || '—'}</div>
            {invoice.clientAddress && <div style={{ fontSize:17, color:'#777', marginTop:2, lineHeight:1.8 }}>{invoice.clientAddress}</div>}
            {invoice.clientEmail && <div style={{ fontSize:17, color:'#777' }}>{invoice.clientEmail}</div>}
            {invoice.clientPhone && <div style={{ fontSize:17, color:'#777' }}>{invoice.clientPhone}</div>}
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.12em', color:'#bbb', marginBottom:6, fontFamily:"'Inter', sans-serif" }}>Job</div>
            <div style={{ fontSize:20, fontWeight:700, color:'#111', lineHeight:1.4 }}>{invoice.title}</div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ padding:isTablet?'0 18px':'0 44px', overflowX:'auto' }}>
          {[
            { label: tradeConf.laborTitle || 'Labor',    rows: invoice.labor,     type:'labor'     },
            { label: 'Materials & Parts',                rows: invoice.materials, type:'materials' },
            { label: 'Equipment & Rental',               rows: invoice.equipment, type:'equipment' },
          ].filter(s=>s.rows?.length>0).map(({ label, rows, type }) => (
            <div key={label}>
              <div style={{ padding:'12px 0 6px', fontSize:16, fontWeight:900, color:tradeConf.color, textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"'Inter', sans-serif", borderTop:'1px solid #eee' }}>{label}</div>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:380 }}>
                <thead>
                  <tr style={{ borderBottom:'1.5px solid #222' }}>
                    {type==='labor'
                      ? ['Description','Hrs','$/Hr','Amount'].map((h,i)=><th key={h} style={{ padding:'9px 8px', textAlign:i===0?'left':'right', fontSize:15, fontWeight:900, color:'#999', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'Inter', sans-serif", whiteSpace:'nowrap' }}>{h}</th>)
                      : type==='materials'
                      ? ['Description','Qty','Unit','Unit Cost','Amount'].map((h,i)=><th key={h} style={{ padding:'9px 8px', textAlign:i===0?'left':'right', fontSize:15, fontWeight:900, color:'#999', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'Inter', sans-serif", whiteSpace:'nowrap' }}>{h}</th>)
                      : ['Description','Qty','Unit','Rate','Amount'].map((h,i)=><th key={h} style={{ padding:'9px 8px', textAlign:i===0?'left':'right', fontSize:15, fontWeight:900, color:'#999', textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:"'Inter', sans-serif", whiteSpace:'nowrap' }}>{h}</th>)
                    }
                  </tr>
                </thead>
                <tbody>
                  {type==='labor' && rows.map((r,i)=>(
                    <tr key={r.id||i} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'11px 8px', fontSize:17, color:'#222' }}>{r.desc}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{r.hrs}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{fmtMoney(r.rate)}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, fontWeight:700, color:'#111' }}>{fmtMoney(r.hrs*r.rate)}</td>
                    </tr>
                  ))}
                  {type==='materials' && rows.map((r,i)=>(
                    <tr key={r.id||i} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'11px 8px', fontSize:17, color:'#222' }}>{r.desc}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{r.qty}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:15, color:'#aaa', fontStyle:'italic' }}>{r.unit}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{fmtMoney(r.cost)}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, fontWeight:700, color:'#111' }}>{fmtMoney(r.qty*r.cost)}</td>
                    </tr>
                  ))}
                  {type==='equipment' && rows.map((r,i)=>(
                    <tr key={r.id||i} style={{ background:i%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f0f0f0' }}>
                      <td style={{ padding:'11px 8px', fontSize:17, color:'#222' }}>{r.desc}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{r.qty}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:15, color:'#aaa', fontStyle:'italic' }}>{r.unit}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, color:'#555' }}>{fmtMoney(r.rate)}</td>
                      <td style={{ padding:'11px 8px', textAlign:'right', fontSize:17, fontWeight:700, color:'#111' }}>{fmtMoney(r.qty*r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div style={{ padding:isTablet?'16px 18px 24px':'20px 44px 32px', display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:isTablet?'100%':280 }}>
            <div style={{ background:'#f7f7f7', border:'1px solid #ebebeb', borderRadius:4, overflow:'hidden' }}>
              {[['Subtotal', fmtMoney(calc.sub)], [`Markup (${invoice.markup}%) — mat+equip`, fmtMoney(calc.mkAmt)], [`Tax (${invoice.tax}%)`, fmtMoney(calc.txAmt)]].map(([label,val])=>( 
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'10px 16px', fontSize:17, color:'#777', borderBottom:'1px solid #e8e8e8' }}>
                  <span>{label}</span><span style={{ fontWeight:600, color:'#444' }}>{val}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', background:C.orange }}>
                <span style={{ fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, letterSpacing:'0.1em', textTransform:'uppercase', color:'#fff' }}>Total Due</span>
                <span style={{ fontFamily:"'Inter', sans-serif", fontSize:30, fontWeight:900, color:'#fff', lineHeight:1 }}>{fmtMoney(calc.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes + footer */}
        {invoice.notes && (
          <div style={{ padding:isTablet?'14px 18px 20px':'18px 44px 28px', background:'#f9f9f9', borderTop:'1.5px solid #eee' }}>
            <div style={{ fontSize:14, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em', color:'#aaa', marginBottom:5, fontFamily:"'Inter', sans-serif" }}>Notes</div>
            <div style={{ fontSize:17, color:'#666', lineHeight:1.75 }}>{invoice.notes}</div>
          </div>
        )}


        {/* Payment methods — shown if contractor has any set up */}
        {payments && (() => {
          const methods = [];
          const online = calcOnlineCharge(calc.total);
          if (payments.stripe?.connected) methods.push({
            label: 'Pay Online — Card / ACH',
            detail: `${fmtMoney(online.clientCharge)} total (includes ${fmtMoney(online.totalFee)} processing fee)`,
            highlight: true,
          });
          if (payments.paypal?.connected) methods.push({ label: 'PayPal', detail: 'Request sent via PayPal' });
          if (payments.venmo?.handle?.trim())   methods.push({ label: 'Venmo',    detail: `@${payments.venmo.handle.replace(/^@/,'')}` });
          if (payments.cashapp?.handle?.trim()) methods.push({ label: 'Cash App', detail: `$${payments.cashapp.handle.replace(/^\$/,'')}` });
          if (payments.zelle?.handle?.trim())   methods.push({ label: 'Zelle',    detail: payments.zelle.handle });
          if (payments.check?.handle?.trim())   methods.push({ label: 'Check',    detail: `Make payable to ${user?.company || user?.name} · ${payments.check.handle}` });
          if (payments.cash?.enabled)           methods.push({ label: 'Cash',     detail: 'Accepted in person' });
          if (methods.length === 0) return null;
          return (
            <div style={{ padding: '18px 44px', borderTop: '1.5px solid #ebebeb', background: '#fafafa' }}>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>How to Pay</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px 24px' }}>
                {methods.map(m => (
                  <div key={m.label} style={{ padding: m.highlight ? '10px 12px' : '0', background: m.highlight ? '#fff7ed' : 'transparent', border: m.highlight ? `1px solid ${C.orange}44` : 'none', borderRadius: m.highlight ? 3 : 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: m.highlight ? C.orange : '#333', fontFamily: "'Inter', sans-serif" }}>{m.label}</div>
                    <div style={{ fontSize: 13, color: '#777', marginTop: 2, lineHeight: 1.5 }}>{m.detail}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#bbb', fontStyle: 'italic' }}>
                Online card payments include a 3.9% + $0.30 processing fee paid by client. Zelle, Venmo, Cash App, check, and cash have no fee.
              </div>
            </div>
          );
        })()}

        {/* Footer */}
        <div style={{ padding:'10px 44px', background:'#f4f4f4', borderTop:'1px solid #e8e8e8', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:14, color:'#bbb', fontStyle:'italic' }}>{invoice.number} — {invoice.createdAt}</div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:12, color:'#ccc', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:"'Inter', sans-serif", fontWeight:600 }}>Powered by</span>
            <span style={{ fontFamily:"'Inter', sans-serif", fontSize:13, fontWeight:900, letterSpacing:'0.04em', lineHeight:1 }}>
              <span style={{ color:C.orange }}>TRADE</span><span style={{ color:'#bbb' }}>VOICE</span>
            </span>
          </div>
        </div>
        <div style={{ height:4, background:tradeConf.stripe }} />
      </div>

      {/* Payment History — below the document */}
      {calc.paid > 0 && (
        <div style={{ marginTop:20, background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>Payments Received</div>
          {(invoice.payments||[]).map((p,i,arr) => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none', gap:12, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:17, fontWeight:600, color:C.text }}>{p.method} {p.ref ? `— #${p.ref}` : ''}</div>
                <div style={{ fontSize:15, color:C.muted, marginTop:2 }}>{p.date}</div>
              </div>
              <div style={{ fontFamily:"'Inter', sans-serif", fontSize:20, fontWeight:900, color:C.success }}>{fmtMoney(p.amount)}</div>
            </div>
          ))}
          {calc.balance > 0.01 && (
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 18px', background:C.raised, borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:16, fontWeight:700, color:C.muted }}>Balance Remaining</span>
              <span style={{ fontFamily:"'Inter', sans-serif", fontSize:19, fontWeight:900, color:C.error }}>{fmtMoney(calc.balance)}</span>
            </div>
          )}
        </div>
      )}

      {/* Activity Log — mirrors QB audit trail */}
      {(invoice.activity||[]).length > 0 && (
        <div style={{ marginTop:16, background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, fontFamily:"'Inter', sans-serif", fontSize:17, fontWeight:900, color:C.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>Activity Log</div>
          {[...(invoice.activity||[])].reverse().map((a,i,arr) => {
            const icons = { created:'Created', sent:'Sent', viewed:'Viewed', payment:'Payment', reminder:'Reminder', voided:'Voided', edited:'Edited' };
            const colors = { created:C.muted, sent:'#1d4ed8', viewed:'#0284c7', payment:C.success, reminder:C.warn, voided:C.error, edited:C.muted };
            return (
              <div key={i} style={{ display:'flex', gap:14, padding:'12px 18px', borderBottom:i<arr.length-1?`1px solid ${C.border}`:'none', alignItems:'flex-start' }}>
                <span style={{ fontFamily:"'Inter', sans-serif", fontSize:13, fontWeight:900, letterSpacing:'0.08em', textTransform:'uppercase', color: colors[a.type]||C.muted, marginTop:2, minWidth:70 }}>{icons[a.type]||a.type}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, color:C.text }}>{a.note}</div>
                  <div style={{ fontSize:14, color:C.dim, marginTop:2 }}>{a.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Invoice Shell ──────────────────────────────────────────────────────────────
function VoiceInvoice({ user, logo, payments, sharedInvoices, setSharedInvoices, persistInvoice, pendingInvoiceId, clearPendingInvoice }) {
  const invoices    = sharedInvoices || [];
  const [view,            setView]         = useState('hub');
  const [activeInvoice,   setActiveInv]    = useState(null);
  const [editingInvoice,  setEditingInv]   = useState(null);
  const [showPaymentModal,setPaymentModal] = useState(false);

  // Auto-open a freshly converted invoice
  useEffect(() => {
    if (pendingInvoiceId) {
      setActiveInv(pendingInvoiceId);
      setView('document');
      if (clearPendingInvoice) clearPendingInvoice();
    }
  }, [pendingInvoiceId]);

  const saveInvoice = async (inv) => {
    try {
      const saved = await persistInvoice(inv);
      setActiveInv(saved.id);
      setView('document');
    } catch (e) {
      alert(e?.message || 'Could not save invoice.');
    }
  };

  const voidInvoice = async (id) => {
    if (!window.confirm('Void this invoice? The record will be kept but the balance zeroed.')) return;
    const target = invoices.find(x => x.id === id);
    if (!target) return;
    try {
      await persistInvoice({
        ...target,
        status: 'void',
        activity: [...(target.activity || []), { date: today(), type: 'voided', note: 'Invoice voided' }],
      });
    } catch (e) {
      alert(e?.message || 'Could not void invoice.');
    }
  };

  const active = invoices.find(i=>i.id===activeInvoice);

  return (
    <div>
      {view==='hub' && (
        <InvoiceHub
          invoices={invoices}
          onSelect={id=>{ setActiveInv(id); setView('document'); }}
          onNew={()=>{ setEditingInv(null); setView('editor'); }}
        />
      )}
      {view==='editor' && (
        <InvoiceEditor
          initial={editingInvoice}
          user={user}
          onSave={saveInvoice}
          onCancel={()=>setView(activeInvoice?'document':'hub')}
        />
      )}
      {view==='document' && active && (
        <InvoiceDocument
          invoice={active}
          user={user}
          logo={logo}
          payments={payments}
          onBack={()=>setView('hub')}
          onEdit={()=>{ setEditingInv(active); setView('editor'); }}
          onRecordPayment={()=>setPaymentModal(true)}
          onVoid={()=>voidInvoice(active.id)}
          onSendReminder={()=>{
            const note = `Overdue reminder sent to ${active.clientEmail}`;
            saveInvoice({ ...active, activity:[...(active.activity||[]), { date:today(), type:'reminder', note }] });
          }}
        />
      )}
      {showPaymentModal && active && (
        <RecordPaymentModal
          invoice={active}
          onSave={inv=>{ saveInvoice(inv); setPaymentModal(false); }}
          onClose={()=>setPaymentModal(false)}
        />
      )}
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// ESTIMATOR
// ══════════════════════════════════════════════════════════════════════════════
function Estimator() {
  const { isTablet } = useBreakpoint();
  const [tab,      setTab]      = useState('labor');
  const [projName, setProjName] = useState('');
  const [labor,    setLabor]    = useState([{ id: 1, desc: '', hrs: 0, rate: 0 }]);
  const [mats,     setMats]     = useState([{ id: 1, desc: '', qty: 0, unit: 'ea', cost: 0 }]);
  const [equip,    setEquip]    = useState([{ id: 1, desc: '', days: 0, rate: 0 }]);
  const [markup,   setMarkup]   = useState(15);
  const [tax,      setTax]      = useState(8.5);

  const nextId = arr => Math.max(0, ...arr.map(r => r.id)) + 1;
  const add    = (setter, tmpl) => setter(a => [...a, { ...tmpl, id: nextId(a) }]);
  const upd    = (setter, id, key, val) => setter(a => a.map(r => r.id === id ? { ...r, [key]: val } : r));
  const del    = (setter, id) => setter(a => a.filter(r => r.id !== id));

  const laborT = labor.reduce((s, r) => s + r.hrs  * r.rate, 0);
  const matsT  = mats.reduce( (s, r) => s + r.qty  * r.cost, 0);
  const equipT = equip.reduce((s, r) => s + r.days * r.rate, 0);
  const sub    = laborT + matsT + equipT;
  const mkAmt  = sub * markup / 100;
  const txAmt  = (sub + mkAmt) * tax / 100;
  const total  = sub + mkAmt + txAmt;
  const fmt    = n => `$${Number(n || 0).toFixed(2)}`;

  const CI = (val, onChange, type = 'text', w = '100%') => (
    <input type={type} value={val} onChange={e => onChange(type === 'number' ? +e.target.value : e.target.value)}
      style={{ ...s.input, width: w, padding: '9px 10px', boxSizing: 'border-box', minHeight: 40 }} />
  );
  const TH = ({ children, right }) => (
    <th style={{ padding: '10px 8px', textAlign: right ? 'right' : 'left', fontSize: 14, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", borderBottom: `1.5px solid ${C.border2}`, background: C.raised, whiteSpace: 'nowrap' }}>{children}</th>
  );
  const TD = ({ val }) => (
    <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: val > 0 ? C.text : C.dim, fontFamily: "'Inter', sans-serif" }}>{fmt(val)}</td>
  );
  const DelX = ({ onClick }) => (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 25, lineHeight: 1, padding: '4px 6px', minHeight: 40 }}>Remove</button>
  );

  const Summary = () => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Cost Summary</div>
        {[['Labor', laborT], ['Materials', matsT], ['Equipment', equipT]].map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 18, color: C.muted }}>{lbl}</span>
            <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: val > 0 ? C.text : C.dim }}>{fmt(val)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 18, color: C.muted }}>Subtotal</span>
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Inter', sans-serif", color: C.text }}>{fmt(sub)}</span>
        </div>
      </div>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
        {[{ label: 'Markup', val: markup, setter: setMarkup, amt: mkAmt }, { label: 'Tax', val: tax, setter: setTax, amt: txAmt }].map(({ label, val, setter, amt }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 18, color: C.muted }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', background: C.surface, border: `1.5px solid ${C.border2}`, borderRadius: 3, overflow: 'hidden' }}>
                <input type="number" value={val} onChange={e => setter(+e.target.value)} min={0} max={100}
                  style={{ ...s.input, width: 62, padding: '7px 8px', textAlign: 'right', background: 'transparent', border: 'none', fontSize: 18, fontWeight: 700, color: C.text }} />
                <span style={{ fontSize: 16, color: C.dim, paddingRight: 8 }}>%</span>
              </div>
              <span style={{ fontSize: 17, color: C.dim, width: 58, textAlign: 'right', fontFamily: "'Inter', sans-serif" }}>{fmt(amt)}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 18px 18px', background: C.orangeLo }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.orange }}>Estimate Total</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 35, fontWeight: 900, color: C.orange, lineHeight: 1 }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );

  const tabDefs = [
    { id: 'labor',     label: 'Labor',    sub: 'Labor',    total: laborT },
    { id: 'materials', label: 'Materials', sub: 'Materials',total: matsT  },
    { id: 'equipment', label: 'Equipment', sub: 'Equipment',total: equipT },
  ];

  return (
    <div>
      <SectionHead icon="" title="Estimate Builder" sub="Build detailed estimates with labor, materials, and equipment" />

      <div style={{ marginBottom: 16 }}>
        <label style={s.label}>Project / Job Name</label>
        <input value={projName} onChange={e => setProjName(e.target.value)}
          placeholder="e.g. Johnson Kitchen Plumbing Repair"
          style={{ ...s.input, width: '100%', padding: '13px 14px', boxSizing: 'border-box', fontSize: 20 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 286px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {tabDefs.map(({ id, label, sub, total }) => {
              const active = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  flex: 1, padding: '13px 6px', background: active ? C.raised : 'transparent',
                  border: 'none', borderBottom: `3px solid ${active ? C.orange : 'transparent'}`,
                  color: active ? C.text : C.muted, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontSize: isTablet ? 18 : 13, fontWeight: 800,
                  letterSpacing: '0.06em', textTransform: 'uppercase', minHeight: 52,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {label}
                  {!isTablet && total > 0 && <div style={{ fontSize: 16, color: active ? C.orange : C.dim, marginTop: 2 }}>{fmt(total)}</div>}
                  {isTablet && <div style={{ fontSize: 14, color: active ? C.orange : C.dim, marginTop: 2, fontWeight: 700 }}>{sub}</div>}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '14px', overflowX: 'auto' }}>
            {tab === 'labor' && <>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
                <thead><tr><TH>Description</TH><TH right>Hrs</TH><TH right>$/Hr</TH><TH right>Total</TH><TH /></tr></thead>
                <tbody>
                  {labor.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '5px 5px' }}>{CI(r.desc, v => upd(setLabor, r.id, 'desc', v))}</td>
                      <td style={{ padding: '5px 5px', width: 68 }}>{CI(r.hrs,  v => upd(setLabor, r.id, 'hrs',  v), 'number', 68)}</td>
                      <td style={{ padding: '5px 5px', width: 78 }}>{CI(r.rate, v => upd(setLabor, r.id, 'rate', v), 'number', 78)}</td>
                      <TD val={r.hrs * r.rate} />
                      <td style={{ padding: '5px 2px', width: 32, textAlign: 'center' }}><DelX onClick={() => del(setLabor, r.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <GhostBtn style={{ marginTop: 10 }} onClick={() => add(setLabor, { desc: '', hrs: 0, rate: 0 })}>+ Add Labor</GhostBtn>
            </>}
            {tab === 'materials' && <>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
                <thead><tr><TH>Description</TH><TH right>Qty</TH><TH right>Unit</TH><TH right>Cost</TH><TH right>Total</TH><TH /></tr></thead>
                <tbody>
                  {mats.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '5px 5px' }}>{CI(r.desc, v => upd(setMats, r.id, 'desc', v))}</td>
                      <td style={{ padding: '5px 5px', width: 58 }}>{CI(r.qty,  v => upd(setMats, r.id, 'qty',  v), 'number', 58)}</td>
                      <td style={{ padding: '5px 5px', width: 70 }}>
                        <select value={r.unit} onChange={e => upd(setMats, r.id, 'unit', e.target.value)}
                          style={{ ...s.input, width: 70, padding: '9px 5px', minHeight: 40 }}>
                          {['ea','ft','in','lb','gal','box','roll','bag','pcs','lot'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '5px 5px', width: 78 }}>{CI(r.cost, v => upd(setMats, r.id, 'cost', v), 'number', 78)}</td>
                      <TD val={r.qty * r.cost} />
                      <td style={{ padding: '5px 2px', width: 32, textAlign: 'center' }}><DelX onClick={() => del(setMats, r.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <GhostBtn style={{ marginTop: 10 }} onClick={() => add(setMats, { desc: '', qty: 0, unit: 'ea', cost: 0 })}>+ Add Material</GhostBtn>
            </>}
            {tab === 'equipment' && <>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
                <thead><tr><TH>Description</TH><TH right>Days</TH><TH right>$/Day</TH><TH right>Total</TH><TH /></tr></thead>
                <tbody>
                  {equip.map(r => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '5px 5px' }}>{CI(r.desc, v => upd(setEquip, r.id, 'desc', v))}</td>
                      <td style={{ padding: '5px 5px', width: 60 }}>{CI(r.days, v => upd(setEquip, r.id, 'days', v), 'number', 60)}</td>
                      <td style={{ padding: '5px 5px', width: 78 }}>{CI(r.rate, v => upd(setEquip, r.id, 'rate', v), 'number', 78)}</td>
                      <TD val={r.days * r.rate} />
                      <td style={{ padding: '5px 2px', width: 32, textAlign: 'center' }}><DelX onClick={() => del(setEquip, r.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <GhostBtn style={{ marginTop: 10 }} onClick={() => add(setEquip, { desc: '', days: 0, rate: 0 })}>+ Add Equipment</GhostBtn>
            </>}
          </div>
        </div>

        {/* Summary + actions */}
        <div style={{ position: isTablet ? 'static' : 'sticky', top: 24 }}>
          <Summary />
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: isTablet ? 'repeat(3,1fr)' : '1fr', gap: 8 }}>
            <PrimaryBtn full={!isTablet}>Send Proposal</PrimaryBtn>
            <GhostBtn   full={!isTablet}>To Invoice</GhostBtn>
            <GhostBtn   full={!isTablet}>Download PDF</GhostBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUOTES DATA & COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
const SEED_CLIENTS = [];

const SEED_QUOTES = [];

let quoteCounter = 4;
const nextQuoteNum = () => {
  const n = quoteCounter++;
  return `QT-2026-${String(n).padStart(4, '0')}`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

// ─── MATH ──────────────────────────────────────────────────────────────────────
const calcQuote = (q, userState, customTaxRates) => {
  const laborT = (q.labor    || []).reduce((s, r) => s + r.hrs  * r.rate, 0);
  const matsT  = (q.materials|| []).reduce((s, r) => s + r.qty  * r.cost, 0);
  const equipT = (q.equipment|| []).reduce((s, r) => s + r.qty  * r.rate, 0);
  const mkBase = matsT + equipT;
  const mkAmt  = mkBase * (q.markup || 0) / 100;
  const stateTax = getStateTax(userState, customTaxRates);
  const taxRate  = q.tax != null ? q.tax : stateTax.matTax;
  const taxableBase = matsT + equipT + mkAmt + (stateTax.laborTax > 0 ? laborT : 0);
  const txAmt  = taxableBase * (taxRate / 100);
  const sub    = laborT + matsT + equipT;
  return { laborT, matsT, equipT, sub, mkAmt, txAmt, total: sub + mkAmt + txAmt };
};
const fmt = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ══════════════════════════════════════════════════════════════════════════════
// QUOTE DOCUMENT (read-only, print-ready, trade-aware)
// ══════════════════════════════════════════════════════════════════════════════
function QuoteDocument({ quote, client, user, logo, onRevise, onBack, onConvertToInvoice }) {
  const { isTablet } = useBreakpoint();
  const calc      = calcQuote(quote, user?.state);
  const locked    = quote.status === 'accepted' || quote.status === 'invoiced';
  const pad       = isTablet ? '20px 18px' : '32px 44px';
  const isBundle  = user?.trades?.length >= 5 || quote.trade === 'bundle';
  const tradeConf = getTradeConfig(quote.trade, user?.trades);
  const accentColor  = user?.accentColor || tradeConf.color;
  const accentStripe = user?.accentColor
    ? `linear-gradient(90deg, ${user.accentColor}, ${user.accentColor}cc)`
    : tradeConf.stripe;

  const copyLink = () => {
    navigator.clipboard?.writeText(`[Quote ${quote.number} shared link]`);
    alert(`Link for ${quote.number} copied to clipboard`);
  };

  // For bundle: group line items by trade
  const bundleGroups = isBundle
    ? ['Plumber','Electrician','HVAC','Roofing','Specialty'].map(t => ({
        trade: t,
        label: TRADE_CONFIG[t].label,
        color: TRADE_CONFIG[t].color,
        labor:     (quote.labor     || []).filter(r => r._trade === t || (!r._trade && t === 'Plumber')),
        materials: (quote.materials || []).filter(r => r._trade === t || (!r._trade && t === 'Plumber')),
        equipment: (quote.equipment || []).filter(r => r._trade === t || (!r._trade && t === 'Plumber')),
      })).filter(g => g.labor.length + g.materials.length + g.equipment.length > 0)
    : null;

  return (
    <div>
      {/* Action bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <Btn variant="ghost" size="sm" onClick={onBack}>Back to Quotes</Btn>
          <Badge status={quote.status} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 800, color: C.orange, letterSpacing: '0.08em' }}>{quote.number}</span>
          {/* Trade label */}
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: tradeConf.color + '22', color: tradeConf.color, fontFamily: "'Inter', sans-serif" }}>
            {tradeConf.label}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!locked && <Btn variant="primary" size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={() => alert('Opening email client…')}>Email Quote</Btn>}
          <Btn variant="ghost" size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={copyLink}>Copy Link</Btn>
          <Btn variant="ghost" size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={() => alert('Opening share sheet…')}>Share</Btn>
          {!locked && quote.status !== 'draft' && <Btn variant="flat" size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={onRevise}>Revise</Btn>}
          {/* Convert-to-Invoice — shown on every quote that isn't already invoiced. Highlighted to stand out. */}
          {quote.status !== 'invoiced' && (
            <Btn variant="primary" size="sm" style={{ flex: isTablet ? 1 : undefined, background: C.success, border: `2px solid ${C.success}` }} onClick={onConvertToInvoice}>
              Convert to Invoice →
            </Btn>
          )}
          {quote.status === 'draft' && <>
            <Btn variant="flat"    size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={onRevise}>Edit</Btn>
            <Btn variant="primary" size="sm" style={{ flex: isTablet ? 1 : undefined }} onClick={() => alert('Sending quote…')}>Send Quote</Btn>
          </>}
        </div>
      </div>

      {quote.revisionNumber > 1 && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: '#fffbeb', border: `1px solid ${C.warn}33`, borderRadius: 3, fontSize: 17, color: C.warn }}>
          Revision {quote.revisionNumber} — {quote.revisionOf ? `supersedes ${quote.revisionOf}` : ''}
        </div>
      )}

      {/* White document */}
      <div style={{ background: '#fff', borderRadius: 4, boxShadow: '0 6px 50px #00000066', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

        {/* Accent-colored top stripe */}
        <div style={{ height: 6, background: accentStripe }} />

        {/* Header */}
        <div style={{ padding: pad, display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 20, borderBottom: '1.5px solid #ebebeb' }}>
          <div>
            {/* Company logo */}
            <div style={{ marginBottom: 14, minHeight: 52 }}>
              {logo
                ? <img src={logo} alt="Company logo"
                    style={{ maxHeight: 80, maxWidth: isTablet ? 160 : 240, objectFit: 'contain', display: 'block' }} />
                : <img src={TRADEVOICE_LOGO} alt="Tradevoice" style={{ maxHeight: 70, maxWidth: isTablet ? 180 : 260, objectFit: 'contain', display: 'block' }} />
              }
            </div>

            {/* Trade label */}
            <div style={{ marginBottom: 8 }}>
              <span style={{ display: 'inline-block', fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 2, background: accentColor, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
                {quote.trade === 'Specialty' && user?.specialtyTypes?.length > 0
                  ? user.specialtyTypes.slice(0, 2).join(' / ') + (user.specialtyTypes.length > 2 ? ` + ${user.specialtyTypes.length - 2} more` : '')
                  : tradeConf.docLabel}
              </span>
            </div>

            {/* Company info */}
            <div style={{ fontSize: 19, fontWeight: 700, color: '#222', marginBottom: 2 }}>{user?.company || user?.name || 'Your Company'}</div>
            {user?.tagline && <div style={{ fontSize: 14, color: accentColor, fontWeight: 600, marginBottom: 4 }}>{user.tagline}</div>}
            <div style={{ fontSize: 17, color: '#777', lineHeight: 1.9 }}>
              {user?.email && <div>{user.email}</div>}
              {user?.phone && <div>{user.phone}</div>}
              {user?.state && <div>{user.state}</div>}
            </div>
            {(user?.license || tradeConf.licenseNote) && (
              <div style={{ marginTop: 6, fontSize: 15, color: '#888', fontStyle: 'italic' }}>{user?.license || tradeConf.licenseNote}</div>
            )}
          </div>
          <div style={{ textAlign: isTablet ? 'left' : 'right', marginTop: isTablet ? 16 : 0, display: 'flex', flexDirection: 'column', alignItems: isTablet ? 'flex-start' : 'flex-end' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: isTablet ? 34 : 46, fontWeight: 900, color: '#111', letterSpacing: '0.04em', lineHeight: 1 }}>QUOTE</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 34, fontWeight: 900, color: accentColor, letterSpacing: '0.1em', marginTop: 4 }}>{quote.number}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 18px' }}>
              {[
                ['Date',    quote.createdAt || '—'],
                ['Expires', quote.expiresAt || 'Net 30'],
                ['Status',  quote.status.toUpperCase()],
              ].map(([label, val]) => (
                <>
                  <span key={label+'-l'} style={{ fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#bbb', paddingTop: 2, whiteSpace: 'nowrap' }}>{label}</span>
                  <span key={label+'-v'} style={{ fontSize: 17, fontWeight: 600, color: val === 'ACCEPTED' ? '#22c55e' : val === 'DECLINED' ? '#ef4444' : '#222' }}>{val}</span>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Prepared For + Project */}
        <div style={{ padding: isTablet ? '16px 18px' : '20px 44px', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 20, background: '#f9f9f9', borderBottom: '1.5px solid #ebebeb' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Prepared For</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>{client?.name || '—'}</div>
            {client?.company && <div style={{ fontSize: 17, color: '#555', marginTop: 1 }}>{client.company}</div>}
            <div style={{ fontSize: 17, color: '#777', lineHeight: 1.8, marginTop: 2 }}>
              {client?.email && <div>{client.email}</div>}
              {client?.phone && <div>{client.phone}</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Project</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111', lineHeight: 1.4 }}>{quote.title}</div>
          </div>
        </div>

        {/* Scope of Work */}
        {quote.scope && (
          <div style={{ padding: isTablet ? '16px 18px' : '22px 44px', borderBottom: '1.5px solid #ebebeb' }}>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Scope of Work</div>
            <div style={{ fontSize: 18, color: '#333', lineHeight: 1.85, maxWidth: 680 }}>{quote.scope}</div>
          </div>
        )}

        {/* ── LINE ITEMS — SINGLE TRADE ── */}
        {!isBundle && (
          <div style={{ padding: isTablet ? '0 18px' : '0 44px', overflowX: 'auto' }}>
            {[
              { label: tradeConf.laborTitle, rows: quote.labor,     cols: ['Description','Hrs','$/Hr','Amount'],              type: 'labor'     },
              { label: 'Materials & Parts',  rows: quote.materials, cols: ['Description','Qty','Unit','Unit Cost','Amount'],  type: 'materials' },
              { label: 'Equipment & Rental', rows: quote.equipment, cols: ['Description','Qty','Unit','Rate','Amount'],            type: 'equipment' },
            ].filter(s => s.rows?.length > 0).map(({ label, rows, cols, type }) => (
              <div key={label}>
                <div style={{ padding: '12px 0 6px', fontSize: 16, fontWeight: 900, color: tradeConf.color, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", borderTop: '1px solid #eee' }}>{label}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #222' }}>
                      {cols.map((h, i) => <th key={h} style={{ padding: '9px 8px', textAlign: i === 0 ? 'left' : 'right', fontSize: 16, fontWeight: 900, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {type === 'labor' && rows.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '11px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.hrs}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.rate)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.hrs * r.rate)}</td>
                      </tr>
                    ))}
                    {type === 'materials' && rows.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '11px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.qty}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 16, color: '#aaa', fontStyle: 'italic' }}>{r.unit}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.cost)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.qty * r.cost)}</td>
                      </tr>
                    ))}
                    {type === 'equipment' && rows.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '11px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.qty}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 16, color: '#aaa', fontStyle: 'italic' }}>{r.unit}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.rate)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.qty * r.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* ── LINE ITEMS — BUNDLE (grouped by trade) ── */}
        {isBundle && bundleGroups && (
          <div style={{ padding: isTablet ? '0 18px' : '0 44px', overflowX: 'auto' }}>
            {bundleGroups.map(group => (
              <div key={group.trade}>
                {/* Trade section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 6px', borderTop: '1.5px solid #eee', marginTop: 4 }}>
                  <span style={{ display: 'inline-block', fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 2, background: group.color, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{group.label}</span>
                </div>

                {[
                  { label: TRADE_CONFIG[group.trade].laborTitle, rows: group.labor,     type: 'labor'     },
                  { label: 'Materials & Parts',                   rows: group.materials, type: 'materials' },
                  { label: 'Equipment & Rental',                  rows: group.equipment, type: 'equipment' },
                ].filter(s => s.rows?.length > 0).map(({ label, rows, type }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 0 4px', fontFamily: "'Inter', sans-serif" }}>{label}</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #ddd' }}>
                          {(type === 'labor'
                            ? ['Description','Hrs','$/Hr','Amount']
                            : type === 'materials'
                            ? ['Description','Qty','Unit','Unit Cost','Amount']
                            : ['Description','Qty','Unit','Rate','Amount']
                          ).map((h, i) => (
                            <th key={h} style={{ padding: '7px 8px', textAlign: i === 0 ? 'left' : 'right', fontSize: 15, fontWeight: 900, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {type === 'labor' && rows.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '10px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.hrs}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.rate)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.hrs * r.rate)}</td>
                          </tr>
                        ))}
                        {type === 'materials' && rows.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '10px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.qty}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 16, color: '#aaa', fontStyle: 'italic' }}>{r.unit}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.cost)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.qty * r.cost)}</td>
                          </tr>
                        ))}
                        {type === 'equipment' && rows.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '10px 8px', fontSize: 18, color: '#222' }}>{r.desc}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{r.qty}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 16, color: '#aaa', fontStyle: 'italic' }}>{r.unit}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, color: '#555' }}>{fmt(r.rate)}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#111' }}>{fmt(r.qty * r.rate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div style={{ padding: isTablet ? '16px 18px 24px' : '20px 44px 28px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: isTablet ? '100%' : 280 }}>
            <div style={{ background: '#f7f7f7', border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden' }}>
              {/* Customer sees: labor, materials (with markup baked in), equipment, tax — no markup line */}
              {[
                [tradeConf.laborTitle, fmt(calc.laborT)],
                ['Materials & Parts',  fmt(calc.matsT + calc.mkAmt)],
                ['Equipment & Rental', fmt(calc.equipT)],
                [`Tax (${quote.tax}%)`, fmt(calc.txAmt)],
              ].filter(([, val]) => val !== '$0.00').map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: 17, color: '#777', borderBottom: '1px solid #eee' }}>
                  <span>{label}</span><span style={{ fontWeight: 600, color: '#444' }}>{val}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', background: tradeConf.color }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>Quote Total</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 35, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{fmt(calc.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div style={{ padding: isTablet ? '14px 18px 22px' : '18px 44px 28px', background: '#f9f9f9', borderTop: '1.5px solid #eee', display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr auto', gap: 24, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>Terms & Conditions</div>
            <div style={{ fontSize: 17, color: '#666', lineHeight: 1.75 }}>{quote.terms || 'Quote valid for 30 days from date of issue.'}</div>
          </div>
          {quote.status === 'sent' && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button style={{ ...s.btn, padding: '11px 20px', fontSize: 17, background: C.success, color: '#fff', minHeight: 44, border: 'none' }}>Accept Quote</button>
              <button style={{ ...s.btn, padding: '11px 16px', fontSize: 17, background: 'transparent', color: C.error, minHeight: 44, border: `1.5px solid ${C.error}40` }}>Decline</button>
            </div>
          )}
        </div>

        {/* Footer — small Tradevoice branding */}
        <div style={{ padding: '10px 44px', background: '#f4f4f4', borderTop: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>
            {quote.number} — {quote.createdAt}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: '#ccc', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Powered by</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1 }}>
              <span style={{ color: C.orange }}>TRADE</span><span style={{ color: '#bbb' }}>VOICE</span>
            </span>
          </div>
        </div>

        <div style={{ height: 4, background: tradeConf.stripe }} />
      </div>
    </div>
  );
}

// ─── TRADE CONFIGURATION ───────────────────────────────────────────────────────
const TRADE_CONFIG = {
  Plumber: {
    color:            '#2563eb',
    stripe:           'linear-gradient(90deg, #1d4ed8, #3b82f6)',
    label:            'Plumbing',
    docLabel:         'Plumbing Services',
    defaultLaborRate: 125,
    laborTitle:       'Plumbing Labor',
    licenseNote:      'Licensed Master Plumber',
    scopePlaceholder: 'Describe the plumbing work to be performed — pipe repairs, fixture installations, drain work, water heater service, shut-off valves, etc. Specify what materials are included and any scope exclusions.',
    matLibrary: [
      { id: 'pm1',  desc: '1/2" Ball Valve, Quarter-Turn',        qty: 1, unit: 'ea',   cost: 38.50 },
      { id: 'pm2',  desc: '3/4" Ball Valve, Quarter-Turn',        qty: 1, unit: 'ea',   cost: 44.00 },
      { id: 'pm3',  desc: 'Braided SS Supply Line 12"',            qty: 1, unit: 'ea',   cost: 14.00 },
      { id: 'pm4',  desc: 'Braided SS Supply Line 24"',            qty: 1, unit: 'ea',   cost: 18.00 },
      { id: 'pm5',  desc: 'PVC 3/4" Schedule 40, 10ft',           qty: 1, unit: 'ea',   cost: 8.50  },
      { id: 'pm6',  desc: 'P-Trap 1-1/2" PVC',                    qty: 1, unit: 'ea',   cost: 7.00  },
      { id: 'pm7',  desc: 'Wax Ring w/ Closet Bolt Kit',           qty: 1, unit: 'ea',   cost: 11.00 },
      { id: 'pm8',  desc: 'Drain Cleanout Plug 3"',                qty: 1, unit: 'ea',   cost: 5.50  },
      { id: 'pm9',  desc: 'Teflon Thread Sealant Tape',            qty: 1, unit: 'roll', cost: 2.50  },
      { id: 'pm10', desc: 'Copper 3/4" Type L, 10ft',              qty: 1, unit: 'ea',   cost: 22.00 },
      { id: 'pm11', desc: 'SharkBite Push-to-Connect 1/2"',        qty: 1, unit: 'ea',   cost: 9.00  },
      { id: 'pm12', desc: 'Misc Plumbing Fittings & Consumables',  qty: 1, unit: 'lot',  cost: 25.00 },
    ],
    equipLibrary: [
      { id: 'pe1', desc: 'Pipe Press Tool Rental',          qty: 1, unit: 'day', rate: 65.00  },
      { id: 'pe2', desc: 'Pipe Cutter (Large Diameter)',    qty: 1, unit: 'day', rate: 35.00  },
      { id: 'pe3', desc: 'Drain Snake / Auger Rental',      qty: 1, unit: 'day', rate: 45.00  },
      { id: 'pe4', desc: 'Hydro-Jetter Rental',             qty: 1, unit: 'day', rate: 180.00 },
      { id: 'pe5', desc: 'Leak Detection Camera',           qty: 1, unit: 'day', rate: 75.00  },
      { id: 'pe6', desc: 'Trencher Rental',                 qty: 1, unit: 'day', rate: 185.00 },
    ],
  },

  Electrician: {
    color:            '#d97706',
    stripe:           'linear-gradient(90deg, #b45309, #f59e0b)',
    label:            'Electrical',
    docLabel:         'Electrical Services',
    defaultLaborRate: 115,
    laborTitle:       'Electrical Labor',
    licenseNote:      'Licensed Master Electrician',
    scopePlaceholder: 'Describe the electrical work to be performed — panel upgrades, wiring, outlet and switch installation, lighting, service entry, GFCI/AFCI protection, etc. Note permit requirements if applicable.',
    matLibrary: [
      { id: 'em1',  desc: 'GFCI Outlet 20A Tamper-Resistant',      qty: 1, unit: 'ea',  cost: 18.00 },
      { id: 'em2',  desc: 'AFCI/GFCI Combo Outlet 20A',            qty: 1, unit: 'ea',  cost: 32.00 },
      { id: 'em3',  desc: '15A Single-Pole Breaker',                qty: 1, unit: 'ea',  cost: 9.50  },
      { id: 'em4',  desc: '20A Single-Pole Breaker',                qty: 1, unit: 'ea',  cost: 11.00 },
      { id: 'em5',  desc: '200A Main Breaker Panel',                qty: 1, unit: 'ea',  cost: 285.00},
      { id: 'em6',  desc: 'Romex 12/2 Wire (50ft)',                 qty: 1, unit: 'ea',  cost: 34.00 },
      { id: 'em7',  desc: 'Romex 14/2 Wire (50ft)',                 qty: 1, unit: 'ea',  cost: 26.00 },
      { id: 'em8',  desc: '3/4" EMT Conduit (10ft)',                qty: 1, unit: 'ea',  cost: 7.50  },
      { id: 'em9',  desc: 'Decora Single-Pole Switch 15A',          qty: 1, unit: 'ea',  cost: 5.00  },
      { id: 'em10', desc: 'LED Recessed Can 6" (Trim Kit)',          qty: 1, unit: 'ea',  cost: 22.00 },
      { id: 'em11', desc: 'Wire Nuts & Connectors (Assorted)',       qty: 1, unit: 'lot', cost: 8.00  },
      { id: 'em12', desc: 'Misc Electrical Consumables',             qty: 1, unit: 'lot', cost: 20.00 },
    ],
    equipLibrary: [
      { id: 'ee1', desc: 'Conduit Bender (Heavy)',           qty: 1, unit: 'day', rate: 40.00  },
      { id: 'ee2', desc: 'Scissor Lift Rental',              qty: 1, unit: 'day', rate: 220.00 },
      { id: 'ee3', desc: 'Thermal Imaging Camera',           qty: 1, unit: 'day', rate: 75.00  },
      { id: 'ee4', desc: 'Generator (10kW) Rental',          qty: 1, unit: 'day', rate: 95.00  },
      { id: 'ee5', desc: 'Cable Puller / Fish Tape Kit',     qty: 1, unit: 'day', rate: 30.00  },
      { id: 'ee6', desc: 'Multimeter & Test Equipment Set',  qty: 1, unit: 'day', rate: 25.00  },
    ],
  },

  HVAC: {
    color:            '#0891b2',
    stripe:           'linear-gradient(90deg, #0e7490, #06b6d4)',
    label:            'HVAC',
    docLabel:         'HVAC Services',
    defaultLaborRate: 95,
    laborTitle:       'HVAC Labor',
    licenseNote:      'EPA 608 Certified Technician',
    scopePlaceholder: 'Describe the HVAC work to be performed — equipment installation, preventive maintenance, refrigerant service, ductwork, thermostat and controls, air quality, etc. Note any EPA certification or permit requirements.',
    matLibrary: [
      { id: 'hm1',  desc: 'MERV-8 Filter 20x20x1',                  qty: 1, unit: 'ea',  cost: 12.00 },
      { id: 'hm2',  desc: 'MERV-11 Filter 20x20x2',                  qty: 1, unit: 'ea',  cost: 19.00 },
      { id: 'hm3',  desc: 'Foaming Coil Cleaner',                    qty: 1, unit: 'ea',  cost: 18.00 },
      { id: 'hm4',  desc: 'R-410A Refrigerant (lb)',                  qty: 1, unit: 'lb',  cost: 22.00 },
      { id: 'hm5',  desc: 'Capacitor, Dual Run 45/5 MFD',            qty: 1, unit: 'ea',  cost: 28.00 },
      { id: 'hm6',  desc: 'Contactor 40A 24V Coil',                  qty: 1, unit: 'ea',  cost: 22.00 },
      { id: 'hm7',  desc: 'Programmable Thermostat',                 qty: 1, unit: 'ea',  cost: 55.00 },
      { id: 'hm8',  desc: 'Smart Thermostat (WiFi)',                  qty: 1, unit: 'ea',  cost: 135.00},
      { id: 'hm9',  desc: 'Flex Duct 6" (10ft)',                      qty: 1, unit: 'ea',  cost: 14.00 },
      { id: 'hm10', desc: 'Sheet Metal Duct (Straight 24")',           qty: 1, unit: 'ea',  cost: 18.00 },
      { id: 'hm11', desc: 'Condensate Drain Pan Treatment Tabs',      qty: 1, unit: 'box', cost: 9.00  },
      { id: 'hm12', desc: 'Misc HVAC Consumables',                    qty: 1, unit: 'lot', cost: 30.00 },
    ],
    equipLibrary: [
      { id: 'he1', desc: 'Refrigerant Recovery Machine',      qty: 1, unit: 'day', rate: 75.00  },
      { id: 'he2', desc: 'Vacuum Pump & Manifold Gauge Set',  qty: 1, unit: 'day', rate: 40.00  },
      { id: 'he3', desc: 'Refrigerant Scale (Digital)',        qty: 1, unit: 'day', rate: 20.00  },
      { id: 'he4', desc: 'Duct Pressure Test Kit',             qty: 1, unit: 'day', rate: 55.00  },
      { id: 'he5', desc: 'Scissor Lift Rental',                qty: 1, unit: 'day', rate: 220.00 },
      { id: 'he6', desc: 'Nitrogen Tank & Regulator',          qty: 1, unit: 'day', rate: 35.00  },
    ],
  },

  Roofing: {
    color:            '#b45309',
    stripe:           'linear-gradient(90deg, #92400e, #d97706)',
    label:            'Roofing',
    docLabel:         'Roofing Services',
    defaultLaborRate: 85,
    laborTitle:       'Roofing Labor',
    licenseNote:      'Licensed Roofing Contractor',
    scopePlaceholder: 'Describe the roofing work to be performed — full replacement, repair, re-roof, flashing, gutters, skylights, etc. Specify material type (architectural shingle, metal, TPO, etc.), square footage, and any structural concerns noted during inspection.',
    matLibrary: [
      { id: 'rm1',  desc: 'Architectural Shingles (Square)',          qty: 1, unit: 'ea',  cost: 110.00 },
      { id: 'rm2',  desc: '3-Tab Shingles (Square)',                  qty: 1, unit: 'ea',  cost: 75.00  },
      { id: 'rm3',  desc: 'Ice & Water Shield (Square)',              qty: 1, unit: 'ea',  cost: 95.00  },
      { id: 'rm4',  desc: 'Synthetic Felt Underlayment (Roll)',       qty: 1, unit: 'roll',cost: 38.00  },
      { id: 'rm5',  desc: 'Ridge Cap Shingles (Bundle)',              qty: 1, unit: 'ea',  cost: 55.00  },
      { id: 'rm6',  desc: 'Drip Edge Aluminum 10ft',                  qty: 1, unit: 'ea',  cost: 9.00   },
      { id: 'rm7',  desc: 'Step Flashing (Bundle of 10)',             qty: 1, unit: 'ea',  cost: 22.00  },
      { id: 'rm8',  desc: 'Valley Flashing 10ft',                     qty: 1, unit: 'ea',  cost: 14.00  },
      { id: 'rm9',  desc: 'Roof Deck Nails 1-3/4" (5lb Box)',        qty: 1, unit: 'box', cost: 18.00  },
      { id: 'rm10', desc: 'Roofing Coil Nails (Coil of 120)',        qty: 1, unit: 'ea',  cost: 12.00  },
      { id: 'rm11', desc: 'Roof Cement / Flashing Sealant (Tube)',    qty: 1, unit: 'ea',  cost: 9.00   },
      { id: 'rm12', desc: 'OSB Sheathing 7/16" (Sheet)',              qty: 1, unit: 'ea',  cost: 28.00  },
      { id: 'rm13', desc: 'Aluminum Gutter 10ft Section',             qty: 1, unit: 'ea',  cost: 14.00  },
      { id: 'rm14', desc: 'Downspout Aluminum 10ft',                  qty: 1, unit: 'ea',  cost: 10.00  },
      { id: 'rm15', desc: 'Misc Roofing Supplies & Fasteners',        qty: 1, unit: 'lot', cost: 35.00  },
    ],
    equipLibrary: [
      { id: 're1', desc: 'Roofing Nail Gun (Coil)',           qty: 1, unit: 'day', rate: 55.00  },
      { id: 're2', desc: 'Air Compressor Rental',             qty: 1, unit: 'day', rate: 45.00  },
      { id: 're3', desc: 'Roofing Tear-Off Shovel & Tools',   qty: 1, unit: 'day', rate: 25.00  },
      { id: 're4', desc: 'Dump Trailer / Debris Haul',        qty: 1, unit: 'day', rate: 175.00 },
      { id: 're5', desc: 'Aerial Lift / Boom Lift Rental',    qty: 1, unit: 'day', rate: 265.00 },
      { id: 're6', desc: 'Safety Harness & Fall Protection',  qty: 1, unit: 'day', rate: 20.00  },
    ],
  },

  Specialty: {
    color:            '#16a34a',
    stripe:           'linear-gradient(90deg, #15803d, #22c55e)',
    label:            'Specialty Trades',
    docLabel:         'Specialty Trade Services',
    defaultLaborRate: 75,
    laborTitle:       'Labor',
    licenseNote:      'Licensed & Insured',
    scopePlaceholder: 'Describe the specialty work to be performed — specify the type of work (painting, flooring, drywall, tile, carpentry, landscaping, appliance repair, or other). List specific tasks, rooms or areas affected, materials included, and any prep or cleanup included in scope.',
    matLibrary: [
      { id: 'sm1',  desc: 'Drywall 4x8 Sheet 1/2"',                  qty: 1, unit: 'ea',  cost: 16.00 },
      { id: 'sm2',  desc: 'Drywall Compound (5 Gallon)',              qty: 1, unit: 'ea',  cost: 22.00 },
      { id: 'sm3',  desc: 'Interior Latex Paint (Gallon)',            qty: 1, unit: 'gal', cost: 38.00 },
      { id: 'sm4',  desc: 'Exterior Paint (Gallon)',                  qty: 1, unit: 'gal', cost: 45.00 },
      { id: 'sm5',  desc: 'Ceramic Floor Tile 12x12 (Sq Ft)',        qty: 1, unit: 'ea',  cost: 2.50  },
      { id: 'sm6',  desc: 'Tile Adhesive / Thin-Set (50lb Bag)',      qty: 1, unit: 'ea',  cost: 22.00 },
      { id: 'sm7',  desc: 'Laminate Flooring (Sq Ft)',               qty: 1, unit: 'ea',  cost: 2.20  },
      { id: 'sm8',  desc: 'LVP Flooring (Sq Ft)',                    qty: 1, unit: 'ea',  cost: 3.50  },
      { id: 'sm9',  desc: 'Carpet (Sq Yd)',                           qty: 1, unit: 'ea',  cost: 12.00 },
      { id: 'sm10', desc: 'Wood Trim / Baseboard 8ft',               qty: 1, unit: 'ea',  cost: 7.00  },
      { id: 'sm11', desc: 'Caulk Paintable Latex (Tube)',             qty: 1, unit: 'ea',  cost: 5.00  },
      { id: 'sm12', desc: 'Misc Supplies & Fasteners',               qty: 1, unit: 'lot', cost: 20.00 },
    ],
    equipLibrary: [
      { id: 'se1', desc: 'Pressure Washer Rental',            qty: 1, unit: 'day', rate: 85.00  },
      { id: 'se2', desc: 'Tile Saw Rental',                   qty: 1, unit: 'day', rate: 65.00  },
      { id: 'se3', desc: 'Floor Sander Rental',               qty: 1, unit: 'day', rate: 95.00  },
      { id: 'se4', desc: 'Rotary Hammer / Core Drill Rental', qty: 1, unit: 'day', rate: 55.00  },
      { id: 'se5', desc: 'Dumpster / Debris Haul',            qty: 1, unit: 'day', rate: 165.00 },
      { id: 'se6', desc: 'Paint Sprayer Rental',              qty: 1, unit: 'day', rate: 75.00  },
    ],
  },

  bundle: {
    color:            '#2d6a4f',
    stripe:           'linear-gradient(90deg, #2563eb 0%, #0891b2 25%, #b45309 50%, #16a34a 75%, #2d6a4f 100%)',
    label:            'Full Service Bundle',
    docLabel:         'Full Service — All Trades',
    defaultLaborRate: 100,
    laborTitle:       'Labor',
    licenseNote:      'Licensed & Insured — All Trades',
    scopePlaceholder: 'Describe the full scope of work across all trades required for this project. Include all systems and installations to be addressed.',
    matLibrary: [],
    equipLibrary: [],
  },
};

// Build bundle libraries from all 5 trades
TRADE_CONFIG.bundle.matLibrary  = ['Plumber','Electrician','HVAC','Roofing','Specialty']
  .flatMap(t => TRADE_CONFIG[t].matLibrary.map(i => ({ ...i, id: `b${i.id}`, _trade: t })));
TRADE_CONFIG.bundle.equipLibrary = ['Plumber','Electrician','HVAC','Roofing','Specialty']
  .flatMap(t => TRADE_CONFIG[t].equipLibrary.map(i => ({ ...i, id: `b${i.id}`, _trade: t })));

// Helper — resolve config for a quote's trade value and user's trades
const getTradeConfig = (trade, userTrades = []) => {
  if (trade === 'bundle' || userTrades.length >= 5) return TRADE_CONFIG.bundle;
  return TRADE_CONFIG[trade] || TRADE_CONFIG.Specialty;
};

// ─── CALENDAR PICKER ──────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ value, onChange, label }) {
  // value is 'YYYY-MM-DD' string or ''
  const parse  = (v) => v ? new Date(v + 'T12:00:00') : null;
  const fmt2   = (n) => String(n).padStart(2, '0');
  const toStr  = (d) => `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;

  const today     = new Date();
  const selected  = parse(value);
  const initYear  = selected ? selected.getFullYear() : today.getFullYear();
  const initMonth = selected ? selected.getMonth()    : today.getMonth();

  const [open,       setOpen]       = useState(false);
  const [viewYear,   setViewYear]   = useState(initYear);
  const [viewMonth,  setViewMonth]  = useState(initMonth);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  // Build calendar grid
  const firstDay  = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectDay = (d) => {
    if (!d) return;
    onChange(toStr(new Date(viewYear, viewMonth, d)));
    setOpen(false);
  };

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {label && <Label>{label}</Label>}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...s.input,
          width: '100%', padding: '11px 14px', boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', minHeight: 44, fontSize: 18,
          borderColor: open ? C.orange : C.border2,
          color: selected ? C.text : C.muted,
          background: C.raised,
        }}
      >
        <span>{displayValue}</span>
        <span style={{ fontSize: 16, color: C.muted, marginLeft: 8 }}>&#9660;</span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
          background: C.surface, border: `1.5px solid ${C.orange}`,
          borderRadius: 6, padding: '12px 12px 10px', width: 'min(280px, calc(100vw - 32px))',
          boxShadow: '0 8px 32px #00000044',
        }}>

          {/* Month / Year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ ...s.btn, background: C.raised, border: `1px solid ${C.border2}`, color: C.text, padding: '6px 12px', fontSize: 16, minHeight: 32, borderRadius: 4 }}>&#8249;</button>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '0.04em' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ ...s.btn, background: C.raised, border: `1px solid ${C.border2}`, color: C.text, padding: '6px 12px', fontSize: 16, minHeight: 32, borderRadius: 4 }}>&#8250;</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, color: C.muted, padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const thisDate  = new Date(viewYear, viewMonth, d);
              const isToday   = toStr(thisDate) === toStr(today);
              const isSel     = selected && toStr(thisDate) === value;
              const isPast    = thisDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <button
                  key={d}
                  onClick={() => !isPast && selectDay(d)}
                  style={{
                    ...s.btn,
                    padding: '6px 0', fontSize: 13, textAlign: 'center',
                    borderRadius: 4, minHeight: 32,
                    background: isSel ? C.orange : isToday ? C.orangeLo : 'transparent',
                    color: isSel ? '#fff' : isPast ? C.dim : isToday ? C.orange : C.text,
                    border: isToday && !isSel ? `1px solid ${C.orangeMd}` : '1px solid transparent',
                    cursor: isPast ? 'default' : 'pointer',
                    opacity: isPast ? 0.4 : 1,
                    fontWeight: isSel ? 900 : 500,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => { onChange(toStr(today)); setOpen(false); }}
              style={{ ...s.btn, background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted, padding: '6px 14px', fontSize: 12, minHeight: 32, borderRadius: 4 }}>
              Today
            </button>
            {value && (
              <button onClick={() => { onChange(''); setOpen(false); }}
                style={{ ...s.btn, background: 'transparent', border: 'none', color: C.error, padding: '6px 12px', fontSize: 12, minHeight: 32 }}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function QuickAddPanel({ library, onInsert, onSaveNew, onDelete, type }) {
  const { isTablet } = useBreakpoint();
  const [managing,  setManaging]  = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [selItem,   setSelItem]   = useState(null);  // selected card id
  const [selQty,    setSelQty]    = useState(1);      // qty for selected card

  // New item form state
  const [newDesc, setNewDesc] = useState('');
  const [newQty,  setNewQty]  = useState(1);
  const [newUnit, setNewUnit] = useState(type === 'materials' ? 'ea' : 'day');
  const [newCost, setNewCost] = useState(0);
  const [newDays, setNewDays] = useState(1);
  const [newRate, setNewRate] = useState(0);

  const isMat = type === 'materials';

  const resetForm = () => {
    setNewDesc(''); setNewQty(1); setNewUnit(isMat ? 'ea' : 'day');
    setNewCost(0); setNewDays(1); setNewRate(0);
    setAdding(false);
  };

  const saveNew = () => {
    if (!newDesc.trim()) return;
    const item = isMat
      ? { id: uid(), desc: newDesc.trim(), qty: newQty, unit: newUnit, cost: newCost }
      : { id: uid(), desc: newDesc.trim(), qty: newDays, unit: newUnit, rate: newRate };
    onSaveNew(item);
    resetForm();
  };

  const handleCardClick = (item) => {
    if (managing) return;
    if (selItem === item.id) {
      // second tap — deselect
      setSelItem(null);
      setSelQty(1);
    } else {
      setSelItem(item.id);
      setSelQty(isMat ? item.qty : item.qty);
    }
  };

  const handleInsert = (item, qty) => {
    onInsert(isMat
      ? { ...item, qty }
      : { ...item, qty }
    );
    setSelItem(null);
    setSelQty(1);
  };

  return (
    <div style={{ marginBottom: 18, background: '#f8f9fa', border: `1px solid ${C.border2}`, borderRadius: 4, overflow: 'hidden' }}>

      {/* Panel header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.orange }}>
          Quick Add — Saved Items
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setAdding(!adding); setManaging(false); setSelItem(null); }} style={{
            ...s.btn, background: adding ? C.orangeLo : 'transparent',
            border: `1.5px solid ${adding ? C.orange : C.border2}`,
            color: adding ? C.orange : C.muted,
            padding: '5px 12px', fontSize: 16, minHeight: 32,
          }}>
            {adding ? 'Cancel' : 'Save New Item'}
          </button>
          <button onClick={() => { setManaging(!managing); setAdding(false); setSelItem(null); }} style={{
            ...s.btn, background: managing ? '#fef2f2' : 'transparent',
            border: `1.5px solid ${managing ? C.error : C.border2}`,
            color: managing ? C.error : C.muted,
            padding: '5px 12px', fontSize: 16, minHeight: 32,
          }}>
            {managing ? 'Done' : 'Manage'}
          </button>
        </div>
      </div>

      {/* Save new item form */}
      {adding && (
        <div style={{ padding: '14px', borderBottom: `1px solid ${C.border}`, background: C.raised }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMat ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ ...s.label, marginBottom: 4 }}>Description</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder={isMat ? 'e.g. 3/4" Gate Valve' : 'e.g. Jackhammer Rental'}
                style={{ ...s.input, width: '100%', padding: '9px 10px', boxSizing: 'border-box', minHeight: 44 }} />
            </div>
            {isMat && <>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Qty</label>
                <input type="number" value={newQty} onChange={e => setNewQty(+e.target.value)} min={0} inputMode="decimal"
                  style={{ ...s.input, width: '100%', padding: '9px 6px', textAlign: 'right', boxSizing: 'border-box', minHeight: 44 }} />
              </div>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Unit</label>
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  style={{ ...s.input, width: '100%', padding: '9px 5px', minHeight: 44 }}>
                  {['ea','ft','in','lb','gal','box','roll','bag','pcs','lot','hr'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Cost ea.</label>
                <input type="number" value={newCost} onChange={e => setNewCost(+e.target.value)} min={0} inputMode="decimal"
                  style={{ ...s.input, width: '100%', padding: '9px 6px', textAlign: 'right', boxSizing: 'border-box', minHeight: 44 }} />
              </div>
            </>}
            {!isMat && <>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Qty</label>
                <input type="number" value={newDays} onChange={e => setNewDays(+e.target.value)} min={0} inputMode="decimal"
                  style={{ ...s.input, width: '100%', padding: '9px 6px', textAlign: 'right', boxSizing: 'border-box', minHeight: 44 }} />
              </div>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Unit</label>
                <select value={newUnit} onChange={e => setNewUnit(e.target.value)}
                  style={{ ...s.input, width: '100%', padding: '9px 5px', minHeight: 44 }}>
                  {['hr','day','week','month'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...s.label, marginBottom: 4 }}>Rate</label>
                <input type="number" value={newRate} onChange={e => setNewRate(+e.target.value)} min={0} inputMode="decimal"
                  style={{ ...s.input, width: '100%', padding: '9px 6px', textAlign: 'right', boxSizing: 'border-box', minHeight: 44 }} />
              </div>
            </>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveNew} disabled={!newDesc.trim()} style={{
              ...s.btn, background: C.orange, color: '#ffffff', padding: '10px 20px', fontSize: 17,
              minHeight: 44, opacity: !newDesc.trim() ? 0.4 : 1,
            }}>Save to Library</button>
            <button onClick={resetForm} style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '10px 16px', fontSize: 17, minHeight: 44 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Quick-add grid */}
      <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
        {library.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '16px 0', textAlign: 'center', fontSize: 18, color: C.dim }}>
            No saved items yet. Use "Save New Item" to build your library.
          </div>
        )}
        {library.map(item => {
          const isSel = selItem === item.id;
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button
                onClick={() => handleCardClick(item)}
                style={{
                  width: '100%', background: isSel ? '#fff7ed' : managing ? C.raised : C.surface,
                  border: `1.5px solid ${isSel ? C.orange : managing ? C.error + '50' : C.border2}`,
                  borderRadius: 3, padding: '10px 12px', cursor: managing ? 'default' : 'pointer',
                  textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
                  WebkitTapHighlightColor: 'transparent', minHeight: 56,
                }}
                onPointerEnter={e => { if (!managing && !isSel) e.currentTarget.style.borderColor = C.orange; }}
                onPointerLeave={e => { if (!managing && !isSel) e.currentTarget.style.borderColor = C.border2; }}
              >
                <div style={{ fontSize: 17, fontWeight: isSel ? 700 : 600, color: isSel ? C.text : managing ? C.muted : C.text, lineHeight: 1.4, marginBottom: 3 }}>
                  {item.desc}
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: C.orange, fontWeight: 700 }}>
                  {isMat
                    ? `${item.qty} ${item.unit} — ${Number(item.cost).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ea.`
                    : `${item.qty} ${item.unit} — ${Number(item.rate).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}/${item.unit}`}
                </div>
              </button>

              {/* Selected state — qty controls + add + remove */}
              {isSel && !managing && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '0 2px' }}>
                  {/* − qty + */}
                  <button onClick={e => { e.stopPropagation(); setSelQty(q => Math.max(1, q - 1)); }}
                    style={{ ...s.btn, width: 36, height: 36, minHeight: 36, padding: 0, background: C.raised, border: `1.5px solid ${C.border2}`, color: C.text, fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 900, color: C.orange, minWidth: 24, textAlign: 'center' }}>{selQty}</span>
                  <button onClick={e => { e.stopPropagation(); setSelQty(q => q + 1); }}
                    style={{ ...s.btn, width: 36, height: 36, minHeight: 36, padding: 0, background: C.raised, border: `1.5px solid ${C.border2}`, color: C.text, fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                  {/* Add to quote/invoice */}
                  <button onClick={e => { e.stopPropagation(); handleInsert(item, selQty); }}
                    style={{ ...s.btn, flex: 1, height: 36, minHeight: 36, padding: '0 10px', background: C.orange, border: 'none', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Add</button>
                  {/* Remove from library */}
                  <button onClick={e => { e.stopPropagation(); onDelete(item.id); setSelItem(null); }}
                    style={{ ...s.btn, width: 36, height: 36, minHeight: 36, padding: 0, background: '#fef2f2', border: `1.5px solid ${C.error}44`, color: C.error, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
                </div>
              )}

              {/* Manage mode remove button */}
              {managing && (
                <button
                  onClick={() => onDelete(item.id)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: C.error, border: 'none', borderRadius: 2,
                    color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: "'Inter', sans-serif",
                    padding: '2px 7px', cursor: 'pointer', minHeight: 24,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function QuoteEditor({ initial, clients, user, onSave, onCancel }) {
  const { isTablet } = useBreakpoint();
  const [tab,      setTab]      = useState('scope');
  const [title,    setTitle]    = useState(initial?.title    || '');
  const [clientId, setClientId] = useState(initial?.clientId || (clients[0]?.id || ''));
  const [scope,    setScope]    = useState(initial?.scope    || '');
  const [labor,    setLabor]    = useState(initial?.labor    || [{ id: 1, desc: '', hrs: 1, rate: 0 }]);
  const [mats,     setMats]     = useState(initial?.materials|| [{ id: 1, desc: '', qty: 1, unit: 'ea', cost: 0 }]);
  const [equip,    setEquip]    = useState(initial?.equipment|| []);
  const [selMat,   setSelMat]   = useState(null);
  const [markup,   setMarkup]   = useState(initial?.markup   ?? 15);
  const [tax,      setTax]      = useState(initial?.tax      ?? 8.5);
  const [terms,    setTerms]    = useState(initial?.terms    || user?.defaultTerms || 'Quote valid for 30 days. 50% deposit required to schedule. Balance due upon completion.');
  const [expires,  setExpires]  = useState(initial?.expiresAt|| '');
  const recRef = useRef(null);

  // Trade selection
  const isBundle    = user?.trades?.length >= 5;
  const singleTrade = user?.trades?.length === 1 ? user.trades[0] : null;
  const defaultTrade = initial?.trade || singleTrade || (isBundle ? 'bundle' : user?.trades?.[0] || 'Specialty');
  const [trade, setTrade] = useState(defaultTrade);
  const tradeConf = getTradeConfig(trade, user?.trades);

  // Quick-add libraries — swap when trade changes
  const [matLibrary,  setMatLibrary]  = useState(() => tradeConf.matLibrary.map(i => ({ ...i })));
  const [equipLibrary,setEquipLibrary]= useState(() => tradeConf.equipLibrary.map(i => ({ ...i })));

  // When trade changes, reset libraries to that trade's defaults
  const handleTradeChange = (newTrade) => {
    setTrade(newTrade);
    const conf = getTradeConfig(newTrade, user?.trades);
    setMatLibrary(conf.matLibrary.map(i => ({ ...i })));
    setEquipLibrary(conf.equipLibrary.map(i => ({ ...i })));
  };

  const isRevision = !!initial?.id;
  const calc       = calcQuote({ labor, materials: mats, equipment: equip, markup, tax }, user?.state);

  // ── Row helpers ──
  const nextId = arr => Math.max(0, ...arr.map(r => r.id)) + 1;
  const addRow = (setter, tmpl) => setter(a => [...a, { ...tmpl, id: nextId(a) }]);
  const updRow = (setter, id, key, val) => setter(a => a.map(r => r.id === id ? { ...r, [key]: val } : r));
  const delRow = (setter, id) => setter(a => a.filter(r => r.id !== id));

  // ── AI scope writer ──
  // ── Save ──
  const handleSave = (asDraft) => {
    const q = {
      id: initial?.id || uid(),
      number: initial?.number || nextQuoteNum(),
      clientId, title,
      trade,
      status: asDraft ? 'draft' : (initial?.status || 'draft'),
      scope,
      labor, materials: mats, equipment: equip,
      markup, tax, terms,
      createdAt: initial?.createdAt || new Date().toISOString().split('T')[0],
      sentAt: initial?.sentAt || null,
      expiresAt: expires || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      revisionOf: initial?.revisionOf || null,
      revisionNumber: initial?.revisionNumber || 1,
    };
    onSave(q);
  };

  // ── Shared table helpers ──
  const TH = ({ children, right }) => (
    <th style={{ padding: '9px 7px', textAlign: right ? 'right' : 'left', fontSize: 16, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif", borderBottom: `1.5px solid ${C.border2}`, background: C.raised, whiteSpace: 'nowrap' }}>{children}</th>
  );
  const TC = ({ val }) => (
    <td style={{ padding: '6px 7px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: val > 0 ? C.text : C.dim, fontFamily: "'Inter', sans-serif" }}>{fmt(val)}</td>
  );
  // Accounting-style number cell — formats as $1,234.00 at rest, plain number on focus
  // Always-numeric input. Empty when 0, decimal keypad on iPad, auto-select on focus.
  // We dropped the formatted-on-blur display because the type-switch caused focus quirks.
  const NI = (val, onChange, w = 90, prefix = '') => (
    <div style={{ position: 'relative', width: w, display: 'inline-flex', alignItems: 'center' }}>
      {prefix && <span style={{ position: 'absolute', left: 7, fontSize: 14, fontWeight: 700, color: C.muted, pointerEvents: 'none', zIndex: 1 }}>{prefix}</span>}
      <input
        type="number"
        value={val === 0 || val === undefined || val === null ? '' : val}
        onChange={e => onChange(e.target.value === '' ? 0 : +e.target.value)}
        onFocus={e => e.target.select()}
        min={0}
        step="0.01"
        inputMode="decimal"
        placeholder="0"
        style={{ ...s.input, width: '100%', padding: prefix ? '8px 7px 8px 16px' : '8px 7px', textAlign: 'right', boxSizing: 'border-box', minHeight: 44, fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: C.text, background: C.raised }}
      />
    </div>
  );
  const TI = (val, onChange) => (
    <input type="text" value={val} onChange={e => onChange(e.target.value)}
      style={{ ...s.input, width: '100%', padding: '8px 9px', boxSizing: 'border-box', minHeight: 44 }} />
  );
  const DelX = ({ onClick }) => (
    <button onClick={onClick}
      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
        fontSize: 23, padding: '0', minHeight: 44, minWidth: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 3, WebkitTapHighlightColor: 'transparent' }}
      onPointerDown={e => e.currentTarget.style.color = C.error}
      onPointerUp={e   => e.currentTarget.style.color = C.muted}
      onPointerLeave={e => e.currentTarget.style.color = C.muted}>
      Remove
    </button>
  );

  const TABS = [
    { id: 'scope',     label: 'Scope',     short: 'Scope'    },
    { id: 'labor',     label: 'Labor',     short: 'Labor'    },
    { id: 'materials', label: 'Materials', short: 'Matls'    },
    { id: 'equipment', label: 'Equipment', short: 'Equip'    },
    { id: 'terms',     label: 'Terms',     short: 'Terms'    },
  ];

  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={onCancel} style={{ fontSize: 21, padding: '12px 24px', minHeight: 52 }}>Cancel</Btn>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            {isRevision ? `Revising ${initial.number}` : 'New Quote'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost"   size="sm" onClick={() => handleSave(true)}  style={{ fontSize: 21, padding: '12px 24px', minHeight: 52 }}>Save Draft</Btn>
          <Btn variant="primary" size="sm" onClick={() => handleSave(false)} style={{ fontSize: 21, padding: '12px 24px', minHeight: 52 }}>Save + Preview</Btn>
        </div>
      </div>

      {/* Client + Title row */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '220px 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <Label>Client</Label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            style={{ ...s.input, width: '100%', padding: '11px 12px', minHeight: 44, cursor: 'pointer', boxSizing: 'border-box' }}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
          </select>
        </div>
        <div>
          <Label>Quote Title / Job Description</Label>
          <Input value={title} onChange={setTitle} placeholder="e.g. Kitchen Plumbing Repair & Valve Replacement" />
        </div>
      </div>

      {/* Trade selector + Expiry row */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '200px 200px 1fr', gap: 12, marginBottom: 20 }}>
        {/* Trade picker — hidden when single-trade user */}
        {!singleTrade && (
          <div>
            <Label>Trade</Label>
            <select value={trade} onChange={e => handleTradeChange(e.target.value)}
              style={{ ...s.input, width: '100%', padding: '11px 12px', minHeight: 44, cursor: 'pointer', boxSizing: 'border-box', borderColor: tradeConf.color + '88' }}>
              {user?.trades?.map(t => (
                <option key={t} value={t}>{t === 'Specialty' ? 'Specialty Trades' : t}</option>
              ))}
              {isBundle && <option value="bundle">All Trades — Full Service</option>}
            </select>
          </div>
        )}
        {/* Trade badge shown for single-trade users */}
        {singleTrade && (
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, background: tradeConf.color + '22', color: tradeConf.color, fontFamily: "'Inter', sans-serif", border: `1.5px solid ${tradeConf.color}44` }}>
              {tradeConf.label}
            </span>
          </div>
        )}
        <div>
          <CalendarPicker label="Expiration Date" value={expires} onChange={setExpires} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 270px', gap: 16, alignItems: 'start' }}>

        {/* Main editor */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {TABS.map(({ id, label, short }) => {
              const active = tab === id;
              return (
                <button key={id} onClick={() => setTab(id)} style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: isTablet ? '18px 12px' : '16px 20px', whiteSpace: 'nowrap',
                  background: active ? C.raised : 'transparent',
                  border: 'none', borderBottom: `3px solid ${active ? C.orange : 'transparent'}`,
                  color: active ? C.text : C.muted, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: isTablet ? 16 : 18, fontWeight: 800,
                  letterSpacing: '0.07em', textTransform: 'uppercase', minHeight: 62,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {isTablet ? short : label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '18px 16px' }}>

            {/* ── SCOPE TAB ── */}
            {tab === 'scope' && (
              <div>
                {/* Scope of work */}
                <Label>Scope of Work (customer-facing)</Label>
                <Input value={scope} onChange={setScope} rows={8}
                  placeholder={tradeConf.scopePlaceholder} />
              </div>
            )}

            {/* ── LABOR TAB ── */}
            {tab === 'labor' && (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ marginBottom: 10, padding: '8px 12px', background: tradeConf.color + '18', border: `1px solid ${tradeConf.color}33`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: tradeConf.color, fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {tradeConf.laborTitle} — Default rate: ${tradeConf.defaultLaborRate}/hr
                  </span>
                  <button onClick={() => addRow(setLabor, { desc: '', hrs: 1, rate: tradeConf.defaultLaborRate })}
                    style={{ ...s.btn, background: tradeConf.color, color: '#fff', padding: '6px 14px', fontSize: 16, minHeight: 34 }}>
                    Add Labor Row
                  </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                  <thead><tr><TH>Description</TH><TH right>Hrs</TH><TH right>$/Hr</TH><TH right>Total</TH><TH /></tr></thead>
                  <tbody>
                    {labor.map(r => (
                      <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '5px 5px' }}>{TI(r.desc, v => updRow(setLabor, r.id, 'desc', v))}</td>
                        <td style={{ padding: '5px 5px', width: 70 }}>{NI(r.hrs,  v => updRow(setLabor, r.id, 'hrs',  v), 68)}</td>
                        <td style={{ padding: '5px 5px', width: 80 }}>{NI(r.rate, v => updRow(setLabor, r.id, 'rate', v), 96, '$')}</td>
                        <TC val={r.hrs * r.rate} />
                        <td style={{ padding: '5px 2px', width: 32 }}><DelX onClick={() => delRow(setLabor, r.id)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {labor.length === 0 && <div style={{ padding: '12px 0', fontSize: 18, color: C.dim }}>No labor rows yet. Use the button above to add a row with the default rate pre-filled.</div>}
              </div>
            )}

            {/* ── MATERIALS TAB ── */}
            {tab === 'materials' && (
              <div>
                <QuickAddPanel
                  type="materials"
                  library={matLibrary}
                  onInsert={item => addRow(setMats, { desc: item.desc, qty: item.qty, unit: item.unit, cost: item.cost })}
                  onSaveNew={item => setMatLibrary(prev => [...prev, item])}
                  onDelete={id  => setMatLibrary(prev => prev.filter(i => i.id !== id))}
                />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                    <thead><tr><TH>Description</TH><TH right>Qty</TH><TH right>Unit</TH><TH right>Cost ea.</TH><TH right>Total</TH><TH right>Library</TH><TH /></tr></thead>
                    <tbody>
                      {mats.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '5px 5px' }}>{TI(r.desc, v => updRow(setMats, r.id, 'desc', v))}</td>
                          <td style={{ padding: '5px 5px', width: 60 }}>{NI(r.qty,  v => updRow(setMats, r.id, 'qty',  v), 56)}</td>
                          <td style={{ padding: '5px 5px', width: 70 }}>
                            <select value={r.unit} onChange={e => updRow(setMats, r.id, 'unit', e.target.value)}
                              style={{ ...s.input, width: 70, padding: '8px 5px', minHeight: 44 }}>
                              {['ea','ft','in','lb','gal','box','roll','bag','pcs','lot','hr'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '5px 5px', width: 80 }}>{NI(r.cost, v => updRow(setMats, r.id, 'cost', v), 96, '$')}</td>
                          <TC val={r.qty * r.cost} />
                          <td style={{ padding: '5px 5px', width: 60, textAlign: 'center' }}>
                            <button
                              title="Save this item to your Quick Add library"
                              onClick={() => {
                                if (!r.desc.trim()) return;
                                const exists = matLibrary.some(i => i.desc.toLowerCase() === r.desc.toLowerCase());
                                if (exists) return;
                                setMatLibrary(prev => [...prev, { id: uid(), desc: r.desc, qty: r.qty, unit: r.unit, cost: r.cost }]);
                              }}
                              style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '5px 8px', fontSize: 15, minHeight: 44, minWidth: 44, WebkitTapHighlightColor: 'transparent' }}
                              onPointerEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
                              onPointerLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.muted; }}
                            >Save</button>
                          </td>
                          <td style={{ padding: '5px 2px', width: 56 }}><DelX onClick={() => delRow(setMats, r.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Btn variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => addRow(setMats, { desc: '', qty: 1, unit: 'ea', cost: 0 })}>Add Material Row</Btn>
                </div>
              </div>
            )}

            {/* ── EQUIPMENT TAB ── */}
            {tab === 'equipment' && (
              <div>
                <QuickAddPanel
                  type="equipment"
                  library={equipLibrary}
                  onInsert={item => addRow(setEquip, { desc: item.desc, qty: item.qty, unit: item.unit, rate: item.rate })}
                  onSaveNew={item => setEquipLibrary(prev => [...prev, item])}
                  onDelete={id  => setEquipLibrary(prev => prev.filter(i => i.id !== id))}
                />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                    <thead><tr><TH>Description</TH><TH right>Qty</TH><TH right>Unit</TH><TH right>Rate</TH><TH right>Total</TH><TH right>Library</TH><TH /></tr></thead>
                    <tbody>
                      {equip.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '5px 5px' }}>{TI(r.desc, v => updRow(setEquip, r.id, 'desc', v))}</td>
                          <td style={{ padding: '5px 5px', width: 60 }}>{NI(r.qty,  v => updRow(setEquip, r.id, 'qty',  v), 56)}</td>
                          <td style={{ padding: '5px 5px', width: 78 }}>
                            <select value={r.unit} onChange={e => updRow(setEquip, r.id, 'unit', e.target.value)}
                              style={{ ...s.input, width: 78, padding: '9px 5px', minHeight: 44, cursor: 'pointer' }}>
                              {['hr','day','week','month'].map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '5px 5px', width: 80 }}>{NI(r.rate, v => updRow(setEquip, r.id, 'rate', v), 96, '$')}</td>
                          <TC val={r.qty * r.rate} />
                          <td style={{ padding: '5px 5px', width: 60, textAlign: 'center' }}>
                            <button
                              title="Save this item to your Quick Add library"
                              onClick={() => {
                                if (!r.desc.trim()) return;
                                const exists = equipLibrary.some(i => i.desc.toLowerCase() === r.desc.toLowerCase());
                                if (exists) return;
                                setEquipLibrary(prev => [...prev, { id: uid(), desc: r.desc, qty: r.qty, unit: r.unit, rate: r.rate }]);
                              }}
                              style={{ ...s.btn, background: 'transparent', border: `1.5px solid ${C.border2}`, color: C.muted, padding: '5px 8px', fontSize: 15, minHeight: 44, minWidth: 44, WebkitTapHighlightColor: 'transparent' }}
                              onPointerEnter={e => { e.currentTarget.style.borderColor = C.orange; e.currentTarget.style.color = C.orange; }}
                              onPointerLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.muted; }}
                            >Save</button>
                          </td>
                          <td style={{ padding: '5px 2px', width: 56 }}><DelX onClick={() => delRow(setEquip, r.id)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Btn variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => addRow(setEquip, { desc: '', qty: 1, unit: 'day', rate: 0 })}>Add Equipment Row</Btn>
                  {equip.length === 0 && <div style={{ padding: '12px 0 4px', fontSize: 18, color: C.dim }}>No equipment added. Tap a saved item above or add a row manually.</div>}
                </div>
              </div>
            )}

            {/* ── TERMS TAB ── */}
            {tab === 'terms' && (
              <div>
                <Label>Terms & Conditions</Label>
                <Input value={terms} onChange={setTerms} rows={5} placeholder="Quote valid for 30 days. 50% deposit required to schedule. Balance due upon completion." />
              </div>
            )}
          </div>
        </div>

        {/* Live summary */}
        <div style={{ position: isTablet ? 'static' : 'sticky', top: 24 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 0' }}>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Live Total</div>
              {[['Labor', calc.laborT], ['Materials', calc.matsT], ['Equipment', calc.equipT]].map(([lbl, val]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 18, color: C.muted }}>{lbl}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: val > 0 ? C.text : C.dim, fontFamily: "'Inter', sans-serif" }}>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 18, color: C.muted }}>Subtotal</span>
                <span style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>{fmt(calc.sub)}</span>
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
              {/* Markup — materials + equipment only */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 18, color: C.muted }}>Markup</span>
                  <span style={{ fontSize: 12, color: C.dim, marginLeft: 5 }}>mat + equip only</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: C.raised, border: `1.5px solid ${C.border2}`, borderRadius: 3, overflow: 'hidden' }}>
                    <input type="number" value={markup} onChange={e => setMarkup(+e.target.value)} min={0} max={100}
                      style={{ ...s.input, width: 58, padding: '6px 7px', textAlign: 'right', background: 'transparent', border: 'none', fontSize: 18, fontWeight: 700, color: C.text }} />
                    <span style={{ fontSize: 16, color: C.dim, paddingRight: 7 }}>%</span>
                  </div>
                  <span style={{ fontSize: 16, color: C.dim, width: 52, textAlign: 'right', fontFamily: "'Inter', sans-serif" }}>{fmt(calc.mkAmt)}</span>
                </div>
              </div>
              {/* Tax — with labor tax indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 18, color: C.muted }}>Tax</span>
                  {laborTaxable(user?.state)
                    ? <span style={{ fontSize: 12, color: C.warn, marginLeft: 5, fontWeight: 700 }}>labor taxable in {user?.state?.split(',')[0]}</span>
                    : <span style={{ fontSize: 12, color: C.dim, marginLeft: 5 }}>mat + equip only</span>
                  }
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: C.raised, border: `1.5px solid ${C.border2}`, borderRadius: 3, overflow: 'hidden' }}>
                    <input type="number" value={tax} onChange={e => setTax(+e.target.value)} min={0} max={100}
                      style={{ ...s.input, width: 58, padding: '6px 7px', textAlign: 'right', background: 'transparent', border: 'none', fontSize: 18, fontWeight: 700, color: C.text }} />
                    <span style={{ fontSize: 16, color: C.dim, paddingRight: 7 }}>%</span>
                  </div>
                  <span style={{ fontSize: 16, color: C.dim, width: 52, textAlign: 'right', fontFamily: "'Inter', sans-serif" }}>{fmt(calc.txAmt)}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 16px', background: C.orangeLo }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 900, color: C.orange, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quote Total</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 33, fontWeight: 900, color: C.orange, lineHeight: 1 }}>{fmt(calc.total)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Btn variant="primary" full onClick={() => handleSave(false)}>Save + Preview</Btn>
            <Btn variant="ghost"   full onClick={() => handleSave(true)}>Save as Draft</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUOTES HUB  (folders + list)
// ══════════════════════════════════════════════════════════════════════════════
function QuotesHub({ quotes, clients, onSelect, onNew, onNewClient }) {
  const { isTablet } = useBreakpoint();
  const [selectedClient, setSelectedClient] = useState('all');
  const [search, setSearch] = useState('');
  const [showFolders, setShowFolders] = useState(!isTablet);

  const filtered = quotes.filter(q => {
    const matchClient = selectedClient === 'all' || q.clientId === selectedClient;
    const matchSearch = !search.trim() || q.title.toLowerCase().includes(search.toLowerCase()) || q.number.toLowerCase().includes(search.toLowerCase());
    return matchClient && matchSearch;
  }).sort((a, b) => b.number.localeCompare(a.number));

  const clientQuoteCounts = clients.reduce((acc, c) => {
    acc[c.id] = quotes.filter(q => q.clientId === c.id).length;
    return acc;
  }, {});

  const Folder = ({ id, name, count, company }) => {
    const active = selectedClient === id;
    return (
      <button onClick={() => { setSelectedClient(id); if (isTablet) setShowFolders(false); }} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', background: active ? C.orangeLo : 'transparent',
        border: 'none', borderLeft: `2px solid ${active ? C.orange : 'transparent'}`,
        cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: active ? C.orange : C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          {company && <div style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{company}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: active ? C.orange : C.dim, flexShrink: 0 }}>{count}</span>
      </button>
    );
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.025em' }}>Quotes</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: C.muted, fontWeight: 500 }}>{quotes.length} total — {quotes.filter(q => q.status === 'sent').length} awaiting response</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isTablet && <Btn variant="flat" size="sm" onClick={() => setShowFolders(!showFolders)} style={{ fontSize: 21, padding: '12px 22px', minHeight: 52 }}>Clients</Btn>}
          <Btn variant="primary" size="sm" onClick={onNew} style={{ fontSize: 21, padding: '12px 22px', minHeight: 52 }}>New Quote</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '220px 1fr', gap: 16 }}>

        {/* Folders sidebar */}
        {(!isTablet || showFolders) && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', paddingBottom: 6 }}>
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontFamily: "'Inter', sans-serif" }}>Client Folders</span>
              <button onClick={onNewClient} style={{ background: 'transparent', border: 'none', color: C.orange, fontSize: 20, lineHeight: 1, padding: '0 4px', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontWeight: 400 }} title="New client" aria-label="New client">+</button>
            </div>
            <Folder id="all" name="All Quotes" count={quotes.length} />
            {clients.map(c => <Folder key={c.id} id={c.id} name={c.name} company={c.company} count={clientQuoteCounts[c.id] || 0} />)}
          </div>
        )}

        {/* Quote list */}
        {(!isTablet || !showFolders) && (
          <div>
            {/* Search bar */}
            <div style={{ marginBottom: 14 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by title or quote number…"
                style={{ ...s.input, width: '100%', padding: '11px 14px', boxSizing: 'border-box', fontSize: 18 }} />
            </div>

            {/* Quotes */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted, fontSize: 19 }}>
                  No quotes yet.{' '}
                  <button onClick={onNew} style={{ background: 'none', border: 'none', color: C.orange, cursor: 'pointer', fontSize: 19, fontWeight: 600, padding: 0 }}>
                    Create your first quote
                  </button>
                </div>
              ) : filtered.map((q, i) => {
                const client = clients.find(c => c.id === q.clientId);
                const calc   = calcQuote(q);
                return (
                  <button key={q.id} onClick={() => onSelect(q.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    background: 'transparent', border: 'none',
                    borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.raised}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {/* Number + status */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: C.orange, letterSpacing: '0.07em', marginBottom: 3 }}>{q.number}</div>
                      <Badge status={q.status} />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 19, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</div>
                      <div style={{ fontSize: 17, color: C.muted, marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <span>{client?.name || '—'}</span>
                        <span style={{ color: C.dim }}>-</span>
                        <span>{q.createdAt}</span>
                        {q.revisionNumber > 1 && <span style={{ color: C.warn }}>Rev {q.revisionNumber}</span>}
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, fontWeight: 900, color: C.text }}>{fmt(calc.total)}</div>
                      <div style={{ fontSize: 15, color: C.dim, marginTop: 2 }}>Exp: {q.expiresAt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW CLIENT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function NewClientModal({ onSave, onClose }) {
  const [name,    setName]    = useState('');
  const [company, setCompany] = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 4, padding: 28, width: '100%', maxWidth: 400 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 25, fontWeight: 900, color: C.text, marginBottom: 20, textTransform: 'uppercase' }}>New Client</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><Label>Name *</Label><Input value={name}    onChange={setName}    placeholder="Sandra Johnson" /></div>
          <div><Label>Company</Label><Input value={company} onChange={setCompany} placeholder="ABC Rentals LLC" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={setEmail} placeholder="client@email.com" /></div>
          <div><Label>Phone</Label><Input type="tel" value={phone} onChange={setPhone} placeholder="(512) 555-0000" /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={() => name.trim() && onSave({ id: uid(), name: name.trim(), company: company.trim(), email, phone })} disabled={!name.trim()}>Add Client</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ProfileModal({ profile, onSave, onClose }) {
  const { isTablet } = useBreakpoint();
  const [name,         setName]        = useState(profile.name         || '');
  const [company,      setCompany]     = useState(profile.company      || '');
  const [email,        setEmail]       = useState(profile.email        || '');
  const [phone,        setPhone]       = useState(profile.phone        || '');
  const [state,        setState]       = useState(profile.state        || '');
  const [logo,         setLogo]        = useState(profile.logo         || null);
  const [tagline,      setTagline]     = useState(profile.tagline      || '');
  const [license,      setLicense]     = useState(profile.license      || '');
  const [accentColor,  setAccentColor] = useState(profile.accentColor  || '');
  const [defaultTerms, setDefaultTerms]= useState(profile.defaultTerms || 'Quote valid for 30 days. 50% deposit required to schedule. Balance due upon completion.');
  const fileRef = useRef(null);

  const PRESET_COLORS = [
    { label: 'Tradevoice Green', val: '#2d6a4f' },
    { label: 'Navy Blue',        val: '#1e3a5f' },
    { label: 'Forest Green',     val: '#166534' },
    { label: 'Burgundy',         val: '#7f1d1d' },
    { label: 'Slate Gray',       val: '#334155' },
    { label: 'Deep Purple',      val: '#4c1d95' },
    { label: 'Custom',           val: 'custom'  },
  ];

  const [colorMode, setColorMode] = useState(
    !accentColor ? 'trade' :
    PRESET_COLORS.find(p => p.val === accentColor && p.val !== 'custom') ? accentColor :
    'custom'
  );

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalColor = colorMode === 'trade' ? '' : colorMode === 'custom' ? accentColor : colorMode;
    onSave({ ...profile, name, company, email, phone, state, logo, tagline, license, accentColor: finalColor, defaultTerms });
  };

  const F = ({ label, children, hint }) => (
    <div>
      <label style={s.label}>{label}</label>
      {hint && <div style={{ fontSize: 13, color: C.dim, marginBottom: 6, marginTop: -4 }}>{hint}</div>}
      {children}
    </div>
  );
  const I = (val, onChange, ph, type='text') => (
    <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={ph}
      style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 17, minHeight: 48 }} />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000bb', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 4, padding: '28px 26px', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Profile</div>
        <p style={{ fontSize: 15, color: C.muted, marginBottom: 22, marginTop: 0 }}>Everything here appears on all quotes and invoices.</p>

        {/* Logo */}
        <div style={{ marginBottom: 22 }}>
          <label style={s.label}>Company Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {logo ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={logo} alt="Logo" style={{ maxHeight: 72, maxWidth: 180, objectFit: 'contain', display: 'block', background: '#f8f8f8', padding: 8, borderRadius: 3, border: '1px solid #ddd' }} />
                <button onClick={() => setLogo(null)} style={{ position: 'absolute', top: -8, right: -8, background: C.error, border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 15, fontWeight: 700 }}>×</button>
              </div>
            ) : (
              <div style={{ width: 110, height: 68, border: `2px dashed ${C.border2}`, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: C.raised }}>
                <span style={{ fontSize: 20, color: C.dim }}>+</span>
                <span style={{ fontSize: 11, color: C.dim, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>No Logo</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => fileRef.current?.click()} style={{ ...s.btn, background: C.raised, border: `1.5px solid ${C.border2}`, color: C.text, padding: '10px 18px', fontSize: 15, minHeight: 44 }}>
                {logo ? 'Change Logo' : 'Upload Logo'}
              </button>
              <span style={{ fontSize: 13, color: C.dim }}>PNG, JPG, SVG — max 2MB</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
            <F label="Your Name *">{I(name, setName, 'John Burke')}</F>
            <F label="Company Name">{I(company, setCompany, "Burke's Mechanical")}</F>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12 }}>
            <F label="Email">{I(email, setEmail, 'john@company.com', 'email')}</F>
            <F label="Phone">{I(phone, setPhone, '(512) 555-0000', 'tel')}</F>
          </div>
          <F label="State / Service Area">{I(state, setState, 'Texas, Louisiana')}</F>

          {/* Tagline */}
          <F label="Tagline" hint="Shows under your company name on documents — optional">
            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Austin's Most Trusted Plumber Since 2008"
              style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 17, minHeight: 48 }} />
          </F>

          {/* License number */}
          <F label="License Number" hint="Shown under company info on quotes and invoices">
            <input value={license} onChange={e => setLicense(e.target.value)} placeholder="TX Lic. #M-12345 or Master Plumber #54321"
              style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', fontSize: 17, minHeight: 48 }} />
          </F>

          {/* Accent color */}
          <div>
            <label style={s.label}>Document Accent Color</label>
            <div style={{ fontSize: 13, color: C.dim, marginBottom: 8, marginTop: -4 }}>The color stripe and headers on your quotes and invoices. Leave on "Trade Color" to auto-match by trade.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: colorMode === 'custom' ? 10 : 0 }}>
              {/* Trade color option */}
              <button onClick={() => setColorMode('trade')} style={{
                ...s.btn, padding: '10px 8px', fontSize: 13, minHeight: 48, textAlign: 'center',
                background: colorMode === 'trade' ? C.orangeLo : C.raised,
                border: `2px solid ${colorMode === 'trade' ? C.orange : C.border2}`,
                color: colorMode === 'trade' ? C.orange : C.muted,
                gridColumn: '1 / 3',
              }}>Trade Color (auto)</button>

              {PRESET_COLORS.filter(p => p.val !== 'custom').map(p => (
                <button key={p.val} onClick={() => setColorMode(p.val)} style={{
                  ...s.btn, padding: '8px 4px', minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  border: `2px solid ${colorMode === p.val ? p.val : C.border2}`,
                  background: colorMode === p.val ? p.val + '22' : C.raised,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: p.val, border: '1px solid rgba(0,0,0,0.15)' }} />
                  <span style={{ fontSize: 10, color: C.muted, lineHeight: 1.2, textAlign: 'center' }}>{p.label}</span>
                </button>
              ))}

              <button onClick={() => setColorMode('custom')} style={{
                ...s.btn, padding: '8px 4px', minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                border: `2px solid ${colorMode === 'custom' ? C.orange : C.border2}`,
                background: colorMode === 'custom' ? C.orangeLo : C.raised,
              }}>
                <div style={{ width: 22, height: 22, borderRadius: 4, background: accentColor || '#cccccc', border: '1px solid rgba(0,0,0,0.15)' }} />
                <span style={{ fontSize: 10, color: C.muted }}>Custom</span>
              </button>
            </div>
            {colorMode === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={accentColor || '#2d6a4f'} onChange={e => setAccentColor(e.target.value)}
                  style={{ width: 48, height: 44, border: `1px solid ${C.border2}`, borderRadius: 4, cursor: 'pointer', padding: 2 }} />
                <input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="#2d6a4f"
                  style={{ ...s.input, width: 110, padding: '11px 12px', fontSize: 16, minHeight: 44 }} />
                <span style={{ fontSize: 14, color: C.muted }}>Any hex color</span>
              </div>
            )}
          </div>

          {/* Default terms */}
          <F label="Default Quote Terms" hint="Pre-fills on every new quote — edit per quote as needed">
            <textarea value={defaultTerms} onChange={e => setDefaultTerms(e.target.value)} rows={4}
              style={{ ...s.input, width: '100%', padding: '12px 14px', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.65, fontSize: 15 }} />
          </F>

        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={!name.trim()}>Save Profile</Btn>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// QUOTES
// ══════════════════════════════════════════════════════════════════════════════
function Quotes({ user, logo, taxRates, onConvertToInvoice }) {
  const [clients,       setClients]    = useState([]);
  const [quotes,        setQuotes]     = useState([]);
  const [loading,       setLoading]    = useState(true);
  const [view,          setView]       = useState('hub');
  const [activeQuote,   setActiveQ]    = useState(null);
  const [editingQuote,  setEditingQ]   = useState(null);
  const [showNewClient, setNewClient]  = useState(false);

  // Load both quotes and clients on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qs, cs] = await Promise.all([listQuotes(), listClients()]);
        if (!cancelled) { setQuotes(qs); setClients(cs); }
      } catch (e) {
        console.error('quotes/clients load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveQuote = async (q) => {
    try {
      const saved = await apiUpsertQuote(user.id, q);
      setQuotes(prev => {
        const exists = prev.find(x => x.id === saved.id || (q.id && x.id === q.id));
        return exists
          ? prev.map(x => (x.id === saved.id || x.id === q.id) ? saved : x)
          : [saved, ...prev];
      });
      setActiveQ(saved.id);
      setView('document');
    } catch (e) {
      alert(e?.message || 'Could not save quote.');
    }
  };

  const startRevision = (q) => {
    // The new revision starts as a fresh draft. We strip the DB id so upsert treats it as an insert.
    const rev = {
      ...q, id: undefined, number: nextQuoteNum(), status: 'draft',
      revisionOf: q.number, revisionNumber: (q.revisionNumber || 1) + 1,
      createdAt: new Date().toISOString().split('T')[0], sentAt: null,
    };
    setEditingQ(rev);
    setView('editor');
  };

  const convertToInvoice = async (q) => {
    const client = clients.find(c => c.id === q.clientId);
    try {
      const updated = await apiUpsertQuote(user.id, { ...q, status: 'invoiced' });
      setQuotes(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch (e) {
      console.error('mark quote invoiced failed', e);
    }
    if (onConvertToInvoice) onConvertToInvoice(q, client);
  };

  const addClient = async (c) => {
    try {
      const created = await apiAddClient(user.id, c);
      setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewClient(false);
    } catch (e) {
      alert(e?.message || 'Could not save client.');
    }
  };

  const active  = quotes.find(q => q.id === activeQuote);
  const activeC = active ? clients.find(c => c.id === active.clientId) : null;

  return (
    <div>
      {view === 'hub' && (
        <QuotesHub
          quotes={quotes} clients={clients}
          onSelect={id => { setActiveQ(id); setView('document'); }}
          onNew={() => { setEditingQ(null); setView('editor'); }}
          onNewClient={() => setNewClient(true)}
        />
      )}
      {view === 'editor' && (
        <QuoteEditor
          initial={editingQuote} clients={clients} user={user}
          onSave={saveQuote}
          onCancel={() => setView(activeQuote ? 'document' : 'hub')}
        />
      )}
      {view === 'document' && active && (
        <QuoteDocument
          quote={active} client={activeC} user={user} logo={logo}
          onBack={() => setView('hub')}
          onRevise={() => startRevision(active)}
          onConvertToInvoice={() => convertToInvoice(active)}
        />
      )}
      {showNewClient && <NewClientModal onSave={addClient} onClose={() => setNewClient(false)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BILLING
// ══════════════════════════════════════════════════════════════════════════════
const PLANS = [
  { name: 'Solo',       trades: 1, price: 49.99,  desc: '1 trade — invoicing, quotes, payments', badge: null        },
  { name: 'Pro',        trades: 2, price: 99.99,  desc: 'Up to 3 trades — everything in Solo',   badge: 'POPULAR'   },
  { name: 'All Trades', trades: 5, price: 149.99, desc: 'All 5 trades — full access',             badge: 'BEST VALUE'},
];
// Payment method config — Stripe/PayPal are real integrations, others are display-only handles
const PAYMENT_CONFIG = {
  stripe:  { name: 'Card / ACH',  abbr: 'CC',  type: 'connect',  placeholder: null,               hint: 'Clients pay online — money goes straight to your bank via Stripe' },
  paypal:  { name: 'PayPal',      abbr: 'PP',  type: 'connect',  placeholder: null,               hint: 'Clients pay via PayPal — connect your PayPal Business account' },
  venmo:   { name: 'Venmo',       abbr: 'V',   type: 'handle',   placeholder: '@yourname',        hint: 'Shown on invoice so clients can send payment' },
  cashapp: { name: 'Cash App',    abbr: 'CA',  type: 'handle',   placeholder: '$yourcashtag',     hint: 'Shown on invoice so clients can send payment' },
  zelle:   { name: 'Zelle',       abbr: 'Z',   type: 'handle',   placeholder: 'email or phone',   hint: 'Shown on invoice so clients can send payment' },
  check:   { name: 'Check',       abbr: 'CH',  type: 'handle',   placeholder: 'Mailing address',  hint: 'Printed on invoice — "Make checks payable to [Company]"' },
  cash:    { name: 'Cash',        abbr: '$',   type: 'toggle',   placeholder: null,               hint: 'Shown on invoice as accepted payment option' },
};

function Billing({ user, payments }) {
  const { isTablet } = useBreakpoint();
  const tradeCount   = user.trades?.length || 1;
  const currentPrice = getPrice(tradeCount);
  const planName     = PLANS.find(p => p.trades === tradeCount)?.name || 'Starter';

  // Show only connected/configured methods
  const connected = Object.entries(PAYMENT_CONFIG).filter(([key]) => {
    const p = payments?.[key];
    if (!p) return false;
    if (PAYMENT_CONFIG[key].type === 'toggle') return p.enabled;
    if (PAYMENT_CONFIG[key].type === 'connect') return p.connected;
    return !!p.handle?.trim();
  });

  return (
    <div>
      <SectionHead icon="" title="Billing" sub="Payment setup and billing history" />

      {/* Payment methods */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Accepted Payments</div>
        {connected.length === 0 ? (
          <div style={{ background: C.raised, border: `1px dashed ${C.border2}`, borderRadius: 4, padding: '20px', textAlign: 'center', fontSize: 16, color: C.muted }}>
            No payment methods set up yet. Go to Settings to connect your accounts.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(3,1fr)', gap: 10 }}>
            {connected.map(([key, cfg]) => {
              const p = payments[key];
              const sub = cfg.type === 'connect' ? 'Connected' : cfg.type === 'toggle' ? 'Accepted in person' : p.handle;
              return (
                <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flexShrink: 0, width: 36, height: 36, background: C.raised, border: `1px solid ${C.border2}`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 900, color: C.orange, letterSpacing: '0.04em' }}>{cfg.abbr}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: C.text }}>{cfg.name}</div>
                    <div style={{ fontSize: 15, color: cfg.type === 'connect' ? C.success : C.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Billing history */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Billing History</div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {['Mar 20, 2026','Feb 20, 2026','Jan 20, 2026'].map((date, i, arr) => (
            <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 19, color: C.text, fontWeight: 500 }}>{planName} — Monthly</div>
                <div style={{ fontSize: 17, color: C.muted, marginTop: 2 }}>{date}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>${currentPrice}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.success, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Paid</span>
                <GhostBtn size="sm" style={{ padding: '6px 12px', fontSize: 16 }}>Receipt</GhostBtn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
function Clients({ user, nav }) {
  const { isTablet } = useBreakpoint();
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');
  const [invoices]                  = useState(SEED_INVOICES);
  const [quotes]                    = useState(SEED_QUOTES);
  const [selected,   setSelected]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [newClient,  setNewClient]  = useState({ name: '', company: '', email: '', phone: '' });
  const [saving,     setSaving]     = useState(false);

  // Load clients from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listClients();
        if (!cancelled) setClients(rows);
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Could not load clients.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = clients.filter(c =>
    `${c.name} ${c.company} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const clientInvoices = c => invoices.filter(i => i.clientId === c.id);
  const clientQuotes   = c => quotes.filter(q => q.clientId === c.id);

  const totalOwed = c => clientInvoices(c)
    .filter(i => ['sent','viewed','partial','overdue'].includes(i.status))
    .reduce((s, i) => s + (calcInvoice(i, user?.state).balance || 0), 0);

  const addClient = async () => {
    if (!newClient.name.trim() || saving) return;
    setSaving(true);
    try {
      const created = await apiAddClient(user.id, newClient);
      setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewClient({ name: '', company: '', email: '', phone: '' });
      setShowAdd(false);
    } catch (e) {
      alert(e?.message || 'Could not save client.');
    } finally {
      setSaving(false);
    }
  };

  // ── Client detail view ────────────────────────────────────────────────────
  if (selected) {
    const c = clients.find(x => x.id === selected);
    const inv = clientInvoices(c);
    const quo = clientQuotes(c);
    const owed = totalOwed(c);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setSelected(null)} style={{ ...s.btn, background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted, padding: '8px 16px', fontSize: 14 }}>← Back</button>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 900, color: C.text }}>{c.name}</div>
          {c.company && <span style={{ fontSize: 15, color: C.muted }}>{c.company}</span>}
        </div>

        {/* Client info card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', marginBottom: 12, display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr 1fr', gap: 14 }}>
          {[
            { label: 'Email', val: c.email || '—' },
            { label: 'Phone', val: c.phone || '—' },
            { label: 'Balance Due', val: owed > 0 ? '$' + owed.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'All paid', color: owed > 0 ? C.error : C.success },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: f.color || C.text }}>{f.val}</div>
            </div>
          ))}
        </div>

        {/* Quick-add bar — start a new quote or invoice from this client folder */}
        {nav && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <button onClick={() => nav('quotes')} style={{
              flex: 1, minWidth: 140,
              ...s.btn, background: C.orangeLo, border: `2px solid ${C.orange}`, color: C.orange,
              padding: '11px 18px', fontSize: 13, borderRadius: 50, minHeight: 44,
            }}>+ New Quote</button>
            <button onClick={() => nav('invoice')} style={{
              flex: 1, minWidth: 140,
              ...s.btn, background: C.orange, border: `2px solid ${C.orange}`, color: '#fff',
              padding: '11px 18px', fontSize: 13, borderRadius: 50, minHeight: 44,
            }}>+ New Invoice</button>
          </div>
        )}

        {/* Invoices */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Invoices ({inv.length})</div>
          {inv.length === 0
            ? <div style={{ color: C.dim, fontSize: 15, padding: '14px 0' }}>No invoices yet</div>
            : inv.map(i => {
                const calc = calcInvoice(i, user?.state);
                return (
                  <div key={i.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: C.orange }}>{i.number}</div>
                      <div style={{ fontSize: 14, color: C.text }}>{i.title}</div>
                      <div style={{ fontSize: 13, color: C.muted }}>{i.createdAt}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>{'$' + calc.total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: INV_STATUS[i.status]?.bg || '#f3f4f6', color: INV_STATUS[i.status]?.color || C.muted, textTransform: 'uppercase' }}>{INV_STATUS[i.status]?.label || i.status}</span>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Quotes */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Quotes ({quo.length})</div>
          {quo.length === 0
            ? <div style={{ color: C.dim, fontSize: 15, padding: '14px 0' }}>No quotes yet</div>
            : quo.map(q => (
                <div key={q.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: C.orange }}>{q.number}</div>
                    <div style={{ fontSize: 14, color: C.text }}>{q.title}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>{q.createdAt}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 10, background: '#f3f4f6', color: C.muted, textTransform: 'uppercase' }}>{q.status}</span>
                </div>
              ))
          }
        </div>
      </div>
    );
  }

  // ── Client list view ──────────────────────────────────────────────────────
  return (
    <div>
      <SectionHead title="Clients" sub="Tap a client to see their full history" />

      {/* Search + Add */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          style={{ ...s.input, flex: 1, padding: '12px 14px', fontSize: 16 }}
        />
        <button onClick={() => setShowAdd(true)} style={{
          ...s.btn, background: C.orange, color: '#fff',
          padding: '12px 20px', fontSize: 14, borderRadius: 50,
          border: 'none', whiteSpace: 'nowrap',
        }}>+ Add Client</button>
      </div>

      {/* Add client form */}
      {showAdd && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '18px 20px', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>New Client</div>
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { key: 'name',    label: 'Full Name *',    ph: 'Sandra Johnson'        },
              { key: 'company', label: 'Company',        ph: 'City Rental Group'     },
              { key: 'email',   label: 'Email',          ph: 'sandra@email.com'      },
              { key: 'phone',   label: 'Phone',          ph: '(512) 555-0000'        },
            ].map(f => (
              <div key={f.key}>
                <label style={s.label}>{f.label}</label>
                <input value={newClient[f.key]} onChange={e => setNewClient(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph}
                  style={{ ...s.input, width: '100%', padding: '11px 13px', boxSizing: 'border-box', fontSize: 16 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addClient} disabled={!newClient.name.trim() || saving} style={{ ...s.btn, background: C.orange, color: '#fff', padding: '11px 24px', fontSize: 14, borderRadius: 50, border: 'none', opacity: (newClient.name.trim() && !saving) ? 1 : 0.4 }}>{saving ? 'Saving…' : 'Save Client'}</button>
            <button onClick={() => setShowAdd(false)} style={{ ...s.btn, background: 'transparent', border: `1px solid ${C.border2}`, color: C.muted, padding: '11px 20px', fontSize: 14, borderRadius: 50 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Loading / error / empty / list */}
      {loading
        ? <div style={{ color: C.dim, fontSize: 16, padding: '30px 0', textAlign: 'center' }}>Loading clients…</div>
        : loadError
        ? <div style={{ color: C.error, fontSize: 14, padding: '20px', background: '#fef2f2', border: `1px solid ${C.error}33`, borderRadius: 6, textAlign: 'center' }}>{loadError}</div>
        : filtered.length === 0
        ? <div style={{ color: C.dim, fontSize: 16, padding: '30px 0', textAlign: 'center' }}>{clients.length === 0 ? 'No clients yet — tap "+ Add Client" to create one.' : 'No clients match your search.'}</div>
        : filtered.map(c => {
            const inv = clientInvoices(c);
            const quo = clientQuotes(c);
            const owed = totalOwed(c);
            return (
              <button key={c.id} onClick={() => setSelected(c.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '16px 18px', marginBottom: 10, cursor: 'pointer', textAlign: 'left',
                gap: 12, flexWrap: 'wrap', WebkitTapHighlightColor: 'transparent',
              }}>
                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
                      {c.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: C.text }}>{c.name}</div>
                    {c.company && <div style={{ fontSize: 14, color: C.muted }}>{c.company}</div>}
                    <div style={{ fontSize: 13, color: C.dim }}>{c.email}{c.phone ? `  ·  ${c.phone}` : ''}</div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: C.text, fontFamily: "'Inter', sans-serif" }}>{inv.length}</div>
                    <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoices</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: C.text, fontFamily: "'Inter', sans-serif" }}>{quo.length}</div>
                    <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quotes</div>
                  </div>
                  {owed > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.error, fontFamily: "'Inter', sans-serif" }}>{'$' + owed.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <div style={{ fontSize: 11, color: C.error, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owed</div>
                    </div>
                  )}
                  <span style={{ color: C.muted, fontSize: 18 }}>›</span>
                </div>
              </button>
            );
          })
      }
    </div>
  );
}

// ── Team Member Row with permissions ─────────────────────────────────────────
function TeamMemberRow({ member, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const PERMS = [
    { key: 'createQuotes',    label: 'Create Quotes' },
    { key: 'createInvoices',  label: 'Create Invoices' },
    { key: 'viewAllJobs',     label: 'View All Company Jobs' },
    { key: 'recordPayments',  label: 'Record Payments' },
    { key: 'viewClients',     label: 'View Client List' },
    { key: 'viewDashboard',   label: 'View Dashboard' },
  ];

  const togglePerm = (key) => {
    onUpdate({ ...member, perms: { ...member.perms, [key]: !member.perms[key] } });
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: member.status === 'pending' ? C.warn : C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {member.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{member.email || 'Pending invite'} · {member.trades?.join(', ') || 'No trade set'}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: member.status === 'active' ? '#f0fdf4' : '#fffbeb', color: member.status === 'active' ? C.success : C.warn, flexShrink: 0 }}>
          {member.status === 'active' ? 'Active' : 'Pending'}
        </span>
        <span style={{ color: C.dim, fontSize: 16, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded permissions */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', background: C.raised }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Permissions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {PERMS.map(({ key, label }) => (
              <button key={key} onClick={() => togglePerm(key)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 0', textAlign: 'left' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: member.perms[key] ? C.orange : C.raised, border: `2px solid ${member.perms[key] ? C.orange : C.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {member.perms[key] && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: member.perms[key] ? C.text : C.dim, fontWeight: member.perms[key] ? 600 : 400 }}>{label}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onUpdate({ ...member, perms: Object.fromEntries(PERMS.map(p => [p.key, true])) })} style={{ ...s.btn, background: C.raised, border: `1px solid ${C.border2}`, color: C.muted, padding: '7px 14px', fontSize: 13, borderRadius: 50 }}>All on</button>
            <button onClick={() => onUpdate({ ...member, perms: Object.fromEntries(PERMS.map(p => [p.key, false])) })} style={{ ...s.btn, background: C.raised, border: `1px solid ${C.border2}`, color: C.muted, padding: '7px 14px', fontSize: 13, borderRadius: 50 }}>All off</button>
            <button onClick={() => onRemove(member.id)} style={{ ...s.btn, background: 'transparent', border: `1px solid ${C.error}44`, color: C.error, padding: '7px 14px', fontSize: 13, borderRadius: 50, marginLeft: 'auto' }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function Settings({ user, setUser, logo, onLogoChange, showProfileModal, setShowProfileModal, payments, setPayments, taxRates, setTaxRates, teamMembers, setTeamMembers, persistTeamMember, removeTeamMember }) {
  const { isTablet } = useBreakpoint();
  const tradeCount   = user.trades?.length || 1;
  const currentPrice = getPrice(tradeCount);
  const planName     = PLANS.find(p => p.trades === tradeCount)?.name || 'Starter';

  const updateHandle = (key, val) => setPayments(p => ({ ...p, [key]: { ...p[key], handle: val } }));
  const toggleConnect = (key) => setPayments(p => ({ ...p, [key]: { ...p[key], connected: !p[key]?.connected } }));
  const toggleEnabled = (key) => setPayments(p => ({ ...p, [key]: { ...p[key], enabled: !p[key]?.enabled } }));

  // Build list of states the contractor works in
  const activeStates = (user.states?.length > 1 ? user.states : [user.state || 'Texas'])
    .map(s => s.trim()).filter(Boolean);

  const updateTaxRate = (stateName, field, val) => {
    setTaxRates(prev => ({
      ...prev,
      [stateName]: { ...((prev[stateName]) || {}), [field]: parseFloat(val) || 0 }
    }));
  };

  const resetStateToDefault = (stateName) => {
    setTaxRates(prev => {
      const next = { ...prev };
      delete next[stateName];
      return next;
    });
  };

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>{children}</div>
  );

  return (
    <div>
      <SectionHead icon="" title="Settings" sub="Manage your account, profile, and plan" />

      {/* Profile summary */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Profile</div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '20px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 23, fontWeight: 900, color: C.text }}>{user.name}</div>
            <div style={{ fontSize: 18, color: C.muted, marginTop: 2 }}>{user.company}</div>
            <div style={{ fontSize: 16, color: C.dim, marginTop: 6, lineHeight: 1.8 }}>
              <div>{user.email}</div>
              <div>{user.phone}</div>
              <div>{user.states?.join(', ') || user.state}</div>
            </div>
          </div>
          <GhostBtn size="sm" onClick={() => setShowProfileModal(true)}>Edit Profile</GhostBtn>
        </div>
      </div>

      {/* Logo preview in settings */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Company Logo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {logo
            ? <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={logo} alt="Company logo" style={{ maxHeight: 72, maxWidth: 200, objectFit: 'contain', display: 'block', background: C.raised, padding: 8, borderRadius: 3, border: `1px solid ${C.border}` }} />
                <button onClick={() => onLogoChange(null)} style={{ position: 'absolute', top: -8, right: -8, background: C.error, border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>x</button>
              </div>
            : <div style={{ width: 140, height: 72, border: `2px dashed ${C.border2}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.raised }}>
                <span style={{ fontSize: 14, color: C.dim, fontFamily: "'Inter', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>No Logo</span>
              </div>
          }
          <GhostBtn size="sm" onClick={() => setShowProfileModal(true)}>{logo ? 'Change Logo' : 'Upload Logo'}</GhostBtn>
        </div>
      </div>

      {showProfileModal && (
        <ProfileModal
          profile={{ ...user, logo }}
          onSave={async (p) => {
            // Logo is currently held in local state (no Storage upload yet); everything else persists.
            onLogoChange(p.logo);
            try {
              const saved = await upsertProfile(user.id, {
                name:         p.name,
                company:      p.company,
                phone:        p.phone,
                trades:       user.trades,        // preserve existing — modal doesn't edit these
                states:       user.states,
                tagline:      p.tagline,
                license:      p.license,
                accentColor:  p.accentColor,
                defaultTerms: p.defaultTerms,
              });
              if (setUser) setUser(prev => ({ ...prev, ...saved }));
            } catch (e) {
              alert(e?.message || 'Could not save profile.');
            }
            setShowProfileModal(false);
          }}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* ── Payment Setup ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Payment Setup</SectionLabel>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Connect your accounts so clients can pay you directly. These appear on every invoice and quote you send.
        </div>

        {/* Stripe Connect */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>Card &amp; ACH — Stripe</div>
                {payments?.stripe?.connected && <span style={{ fontSize: 13, fontWeight: 700, background: '#f0fdf4', color: C.success, padding: '2px 8px', borderRadius: 3 }}>Connected</span>}
              </div>
              <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
                Clients pay online by card or bank transfer. Money deposits directly to your bank account.
              </div>
              {/* Fee breakdown */}
              <div style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 3, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Stripe fee',    val: '2.9% + $0.30', color: C.muted  },
                  { label: 'Tradevoice fee', val: '1.0%',         color: C.orange },
                  { label: 'Client pays',   val: '3.9% + $0.30', color: C.text   },
                ].map(f => (
                  <div key={f.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 900, color: f.color }}>{f.val}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: C.dim, marginTop: 8, fontStyle: 'italic' }}>
                You always receive 100% of your invoice amount. The fee is added to the client's total automatically.
              </div>
            </div>
            <button onClick={() => toggleConnect('stripe')} style={{
              ...s.btn, padding: '10px 20px', fontSize: 16, minHeight: 44, flexShrink: 0,
              background: payments?.stripe?.connected ? '#fef2f2' : C.orange,
              border: `1.5px solid ${payments?.stripe?.connected ? C.error + '44' : C.orange}`,
              color: payments?.stripe?.connected ? C.error : C.muted,
            }}>
              {payments?.stripe?.connected ? 'Disconnect' : 'Connect Stripe'}
            </button>
          </div>
        </div>

        {/* PayPal Connect */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '18px 20px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>PayPal</div>
                {payments?.paypal?.connected && <span style={{ fontSize: 13, fontWeight: 700, background: '#f0fdf4', color: C.success, padding: '2px 8px', borderRadius: 3 }}>Connected</span>}
              </div>
              <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.5 }}>Clients pay via PayPal. Connect your PayPal Business account to receive payments.</div>
            </div>
            <button onClick={() => toggleConnect('paypal')} style={{
              ...s.btn, padding: '10px 20px', fontSize: 16, minHeight: 44, flexShrink: 0,
              background: payments?.paypal?.connected ? '#fef2f2' : C.raised,
              border: `1.5px solid ${payments?.paypal?.connected ? C.error + '44' : C.border2}`,
              color: payments?.paypal?.connected ? C.error : C.text,
            }}>
              {payments?.paypal?.connected ? 'Disconnect' : 'Connect PayPal'}
            </button>
          </div>
        </div>

        {/* Handle-based methods */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          {[
            { key: 'venmo',   label: 'Venmo',    prefix: '@',  ph: 'your-venmo-handle' },
            { key: 'cashapp', label: 'Cash App', prefix: '$',  ph: 'yourcashtag' },
            { key: 'zelle',   label: 'Zelle',    prefix: null, ph: 'Email or phone number' },
            { key: 'check',   label: 'Check',    prefix: null, ph: 'Mailing address for checks' },
          ].map(({ key, label, prefix, ph }, i, arr) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap' }}>
              <div style={{ width: 88, fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: C.text, flexShrink: 0 }}>{label}</div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 180 }}>
                {prefix && <span style={{ fontSize: 17, color: C.muted, fontWeight: 700 }}>{prefix}</span>}
                <input
                  value={payments?.[key]?.handle || ''}
                  onChange={e => updateHandle(key, e.target.value)}
                  placeholder={ph}
                  style={{ ...s.input, flex: 1, padding: '9px 12px', fontSize: 16, minHeight: 44 }}
                />
              </div>
              <div style={{ fontSize: 14, color: payments?.[key]?.handle?.trim() ? C.success : C.dim, flexShrink: 0 }}>
                {payments?.[key]?.handle?.trim() ? 'Shows on invoices' : 'Not shown'}
              </div>
            </div>
          ))}
        </div>

        {/* Cash toggle */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 700, color: C.text }}>Cash</div>
            <div style={{ fontSize: 14, color: C.muted, marginTop: 2 }}>Shows "Cash accepted" on invoices for in-person jobs</div>
          </div>
          <button onClick={() => toggleEnabled('cash')} style={{
            ...s.btn, padding: '8px 18px', fontSize: 16, minHeight: 44,
            background: payments?.cash?.enabled ? C.orange : C.raised,
            border: `1.5px solid ${payments?.cash?.enabled ? C.orange : C.border2}`,
            color: payments?.cash?.enabled ? '#fff' : C.muted,
          }}>
            {payments?.cash?.enabled ? 'Enabled' : 'Enable'}
          </button>
        </div>
      </div>

      {/* ── Tax Rates ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <SectionLabel>Tax Rates</SectionLabel>
        <div style={{ fontSize: 15, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Default rates come from 2026 state tax law. Update any rate when laws change — your changes override the defaults on all new quotes and invoices.
        </div>

        {activeStates.map(stateName => {
          const stateKey = Object.keys(STATE_TAX_DEFAULTS).find(k =>
            stateName.toLowerCase().includes(k.toLowerCase())
          );
          const def = stateKey ? STATE_TAX_DEFAULTS[stateKey] : { matTax: 0, laborTax: 0, laborNote: '' };
          const custom = stateKey ? (taxRates[stateKey] || {}) : {};
          const matVal   = custom.matTax   ?? def.matTax;
          const laborVal = custom.laborTax  ?? def.laborTax;
          const isCustomized = stateKey && taxRates[stateKey] !== undefined;

          return (
            <div key={stateName} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '16px 20px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 17, fontWeight: 800, color: C.text }}>{stateName}</div>
                  {def.laborNote && <div style={{ fontSize: 13, color: C.warn, marginTop: 2 }}>{def.laborNote}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isCustomized && <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, background: C.orangeLo, padding: '2px 8px', borderRadius: 10 }}>Customized</span>}
                  {isCustomized && (
                    <button onClick={() => resetStateToDefault(stateKey)} style={{ ...s.btn, background: 'transparent', border: `1px solid ${C.border2}`, color: C.dim, padding: '4px 10px', fontSize: 13, minHeight: 32 }}>
                      Reset to default
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ ...s.label, marginBottom: 6 }}>Materials &amp; Equipment Tax % <span style={{ color: C.dim, fontWeight: 400 }}>default: {def.matTax}%</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={matVal} min={0} max={20} step={0.125}
                      onChange={e => stateKey && updateTaxRate(stateKey, 'matTax', e.target.value)}
                      style={{ ...s.input, width: 90, padding: '10px 12px', fontSize: 18, fontWeight: 700, minHeight: 48 }} />
                    <span style={{ fontSize: 18, color: C.muted, fontWeight: 700 }}>%</span>
                    {def.matTax === 0 && <span style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>No sales tax</span>}
                  </div>
                </div>
                <div>
                  <label style={{ ...s.label, marginBottom: 6 }}>Labor Tax % <span style={{ color: C.dim, fontWeight: 400 }}>default: {def.laborTax}%</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="number" value={laborVal} min={0} max={20} step={0.125}
                      onChange={e => stateKey && updateTaxRate(stateKey, 'laborTax', e.target.value)}
                      style={{ ...s.input, width: 90, padding: '10px 12px', fontSize: 18, fontWeight: 700, minHeight: 48, borderColor: def.laborTax > 0 ? C.warn + '88' : undefined }} />
                    <span style={{ fontSize: 18, color: C.muted, fontWeight: 700 }}>%</span>
                    {def.laborTax === 0 && <span style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>Labor not taxed</span>}
                    {def.laborTax > 0  && <span style={{ fontSize: 13, color: C.warn,    fontWeight: 600 }}>Taxable state</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ fontSize: 13, color: C.dim, marginTop: 8, lineHeight: 1.6, fontStyle: 'italic' }}>
          Local city/county rates may be higher than the state base — adjust accordingly. Consult a tax professional for your specific situation. Existing documents are not retroactively updated.
        </div>
      </div>

      {/* ── Team Management (owner only) ──────────────────────────────────── */}
      {user?.role === 'owner' && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Team</SectionLabel>

          {/* Company code card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Company Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 900, color: C.orange, letterSpacing: '0.12em' }}>{user?.companyCode || 'TV-BRK42X'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Share this code with your techs. They download Tradevoice free, tap "Join a company", and enter this code to request access.</div>
              </div>
              <button onClick={() => navigator.clipboard?.writeText(user?.companyCode || 'TV-BRK42X')} style={{ ...s.btn, background: C.raised, border: `1px solid ${C.border2}`, color: C.muted, padding: '8px 16px', fontSize: 13, borderRadius: 50, flexShrink: 0 }}>Copy Code</button>
            </div>
          </div>

          {/* Pricing note */}
          <div style={{ background: C.orangeLo, border: `1px solid ${C.orange}33`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: C.muted }}>
            Additional team members are <strong style={{ color: C.orange }}>$19.99/mo per seat</strong>. Each seat gets their own login and custom permissions. You control exactly what they can see and do.
          </div>

          {/* Team member list */}
          {(teamMembers || []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {(teamMembers || []).map(member => (
                <TeamMemberRow
                  key={member.id}
                  member={member}
                  onUpdate={async (updated) => {
                    try { await persistTeamMember(updated); }
                    catch (e) { alert(e?.message || 'Could not update team member.'); }
                  }}
                  onRemove={async (id) => { await removeTeamMember(id); }}
                />
              ))}
            </div>
          )}

          {/* Add member button */}
          <button onClick={async () => {
            try {
              await persistTeamMember({
                name: 'New Team Member', email: '', role: 'tech', trades: [], status: 'pending',
                perms: { createQuotes: true, createInvoices: true, viewAllJobs: false, recordPayments: false, viewClients: true, viewDashboard: false },
              });
            } catch (e) {
              alert(e?.message || 'Could not add team member.');
            }
          }} style={{ ...s.btn, background: 'transparent', border: `2px dashed ${C.border2}`, color: C.muted, padding: '14px', fontSize: 15, borderRadius: 8, width: '100%', textAlign: 'center' }}>
            + Add Team Member — $19.99/mo
          </button>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Subscription</div>
        <div style={{ background: '#f0fdf4', border: `1px solid ${C.success}33`, borderRadius: 4, padding: '20px 22px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.success, marginBottom: 4 }}>Active Plan</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 25, fontWeight: 900, color: C.text }}>{planName}</div>
            <div style={{ fontSize: 17, color: C.muted, marginTop: 2 }}>{user.trades?.join(', ')}</div>
            <div style={{ fontSize: 16, color: C.dim, marginTop: 3 }}>Next billing: April 20, 2026</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 43, fontWeight: 900, color: C.orange, lineHeight: 1 }}>${currentPrice}</div>
            <div style={{ fontSize: 17, color: C.muted }}>per month</div>
            <GhostBtn size="sm" style={{ marginTop: 10 }}>Cancel Plan</GhostBtn>
          </div>
        </div>

        {/* Change plan grid */}
        <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>Change Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(2,1fr)', gap: 10 }}>
          {PLANS.map(p => {
            const active = p.trades === tradeCount;
            return (
              <div key={p.name} style={{ position: 'relative', background: active ? C.orangeLo : C.surface, border: `2px solid ${active ? C.orange : C.border}`, borderRadius: 4, padding: '16px 18px', cursor: 'pointer' }}>
                {p.badge && <div style={{ position: 'absolute', top: 0, right: 12, background: C.orange, color: '#ffffff', fontSize: 14, fontWeight: 900, padding: '3px 8px', fontFamily: "'Inter', sans-serif", letterSpacing: '0.08em', borderRadius: '0 0 3px 3px' }}>{p.badge}</div>}
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 21, fontWeight: 900, color: active ? C.orange : C.text }}>{p.name}</div>
                <div style={{ fontSize: 16, color: C.muted, margin: '3px 0 10px' }}>{p.desc}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 29, fontWeight: 900, color: active ? C.orange : C.text }}>
                  ${p.price}<span style={{ fontSize: 17, fontWeight: 400, color: C.muted }}>/mo</span>
                </div>
                {active && <div style={{ marginTop: 5, fontSize: 15, fontWeight: 700, color: C.success, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>Account</div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.text }}>Sign Out</div>
            <div style={{ fontSize: 16, color: C.muted, marginTop: 2 }}>Sign out of your Tradevoice account</div>
          </div>
          <GhostBtn size="sm">Sign Out</GhostBtn>
        </div>
      </div>
    </div>
  );
}


const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'invoice',   label: 'Invoice'   },
  { id: 'quotes',    label: 'Quotes'    },
  { id: 'schedule',  label: 'Schedule'  },
  { id: 'clients',   label: 'Clients'   },
  { id: 'marketing', label: 'Marketing' },
];
const BOTTOM_H = 68;

export default function Tradevoice() {
  useEffect(() => { loadFonts(); }, []);
  const { isTablet } = useBreakpoint();

  const [user,           setUser]           = useState(null);
  const [authChecking,   setAuthChecking]   = useState(true); // true on first load until we know if there's a session

  // Restore session on first mount + listen for auth changes (signs in/out from another tab, token refresh)
  useEffect(() => {
    let cancelled = false;
    // Hard cap on how long we'll wait for the auth bootstrap before giving up and showing the login screen.
    // If supabase-js gets stuck refreshing a stale token, this prevents an infinite "Loading…".
    const safetyTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('auth bootstrap timed out after 5s, falling back to login');
        setAuthChecking(false);
      }
    }, 5000);

    (async () => {
      try {
        const sessionUser = await getSessionUser();
        if (cancelled) return;
        if (sessionUser) {
          const profile = await getProfile(sessionUser.id, sessionUser.email);
          if (!cancelled) setUser(profile ?? { id: sessionUser.id, email: sessionUser.email, role: 'owner', trades: [], states: [] });
        }
      } catch (e) {
        // Network or RLS error during boot — log and continue showing login screen
        console.error('session restore failed', e);
      } finally {
        clearTimeout(safetyTimeout);
        if (!cancelled) setAuthChecking(false);
      }
    })();

    const unsubscribe = onAuthChange(async (sessionUser) => {
      if (!sessionUser) { setUser(null); return; }
      try {
        const profile = await getProfile(sessionUser.id, sessionUser.email);
        setUser(profile ?? { id: sessionUser.id, email: sessionUser.email, role: 'owner', trades: [], states: [] });
      } catch (e) {
        console.error('profile fetch failed', e);
      }
    });

    return () => { cancelled = true; unsubscribe(); };
  }, []);
  const [section, setSection] = useState('dashboard');
  const [logo,    setLogo]    = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [payments, setPayments] = useState({
    stripe:  { connected: false },
    paypal:  { connected: false },
    venmo:   { handle: '' },
    cashapp: { handle: '' },
    zelle:   { handle: '' },
    check:   { handle: '' },
    cash:    { enabled: false },
  });
  const [taxRates, setTaxRates] = useState({}); // contractor overrides keyed by state name
  const [teamMembers, setTeamMembers] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [sharedInvoices, setSharedInvoices] = useState([]);
  const [pendingInvoiceId, setPendingInvoiceId] = useState(null);

  // Hydrate live data from Supabase whenever a user logs in.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [invs, tm] = await Promise.all([
          listInvoices().catch(e => { console.error('listInvoices', e); return []; }),
          listTeam().catch(e => { console.error('listTeam', e); return []; }),
        ]);
        if (cancelled) return;
        setSharedInvoices(invs);
        setTeamMembers(tm);
      } catch (e) {
        console.error('hydration failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Sync settings (payments + taxRates) from the loaded profile into local state.
  useEffect(() => {
    if (!user) return;
    if (user.payments && Object.keys(user.payments).length > 0) {
      setPayments(prev => ({ ...prev, ...user.payments }));
    }
    if (user.taxRates && Object.keys(user.taxRates).length > 0) {
      setTaxRates(user.taxRates);
    }
  }, [user?.id]);

  // Persist an invoice to Supabase and merge the saved row back into local state.
  const persistInvoice = async (inv) => {
    const saved = await apiUpsertInvoice(user.id, inv);
    setSharedInvoices(prev => {
      const exists = prev.find(x => x.id === saved.id || (inv.id && x.id === inv.id));
      return exists
        ? prev.map(x => (x.id === saved.id || x.id === inv.id) ? saved : x)
        : [saved, ...prev];
    });
    return saved;
  };

  // Debounced persistence for the JSONB settings columns (payments + tax_rates on profiles).
  // Without debouncing we'd fire a Supabase update on every keystroke as the user types a Venmo handle, etc.
  const settingsTimer = useRef(null);
  const queueSettingsSave = (patch) => {
    if (!user?.id) return;
    if (settingsTimer.current) clearTimeout(settingsTimer.current);
    settingsTimer.current = setTimeout(async () => {
      try { await upsertProfile(user.id, patch); }
      catch (e) { console.error('settings save failed', e); }
    }, 600);
  };

  const setPaymentsPersist = (next) => {
    setPayments(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      queueSettingsSave({ payments: resolved });
      return resolved;
    });
  };

  const setTaxRatesPersist = (next) => {
    setTaxRates(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      queueSettingsSave({ taxRates: resolved });
      return resolved;
    });
  };

  // Team-member persistence helpers (passed to Settings).
  const persistTeamMember = async (member) => {
    const saved = await apiUpsertTeam(user.id, member);
    setTeamMembers(prev => {
      const exists = prev.find(x => x.id === saved.id || (member.id && x.id === member.id));
      return exists
        ? prev.map(x => (x.id === saved.id || x.id === member.id) ? saved : x)
        : [...prev, saved];
    });
    return saved;
  };

  const removeTeamMember = async (id) => {
    try {
      // Only call the API for rows that look like real DB uuids; client-only rows are dropped from state directly.
      if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        await apiDeleteTeam(id);
      }
    } catch (e) {
      console.error('removeTeamMember', e);
    }
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  // ── Auth state ────────────────────────────────────────────────────────────
  // authScreen: null (app) | 'login' | 'signup' | 'join' | 'onboarding'
  const [authScreen, setAuthScreen] = useState('login');

  const handleSignupComplete = async (data) => {
    try {
      const { user: authUser, session } = await signUp(data.email, data.password);
      // If email confirmation is required, session is null — the user has to verify before signing in.
      if (!session) {
        alert('Account created. Check your email to confirm, then sign in.');
        setAuthScreen('login');
        return;
      }
      // Auth row created; trigger inserted a blank profiles row. Now fill it in.
      const profile = await upsertProfile(authUser.id, {
        name:            data.name,
        company:         data.company,
        phone:           data.phone,
        trades:          data.trades,
        states:          data.states,
        plan:            data.plan,
        role:            'owner',
        companyCode:     'TV-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        acceptedTermsAt: data.acceptedTermsAt ?? new Date().toISOString(),
      });
      setUser(profile);
      setAuthScreen(null);
    } catch (e) {
      alert(e?.message || 'Could not create your account. Try again.');
    }
  };

  // First-load auth check — show a small loader while we ask Supabase if there's a session.
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 13, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Loading…</div>
      </div>
    );
  }

  // Show auth screens when no user
  if (!user) {
    if (authScreen === 'login')    return <LoginScreen    onLogin={u => { setUser(u); setAuthScreen(null); }} onSignup={() => setAuthScreen('signup')} onJoin={() => setAuthScreen('join')} onForgot={() => setAuthScreen('forgot')} />;
    if (authScreen === 'signup')   return <SignupScreen onComplete={handleSignupComplete} onBack={() => setAuthScreen('login')} />;
    if (authScreen === 'join')     return <JoinScreen     onJoin={data => { setUser({ ...data, role: 'tech' }); setAuthScreen(null); }} onBack={() => setAuthScreen('login')} />;
    if (authScreen === 'forgot')   return <Suspense fallback={<div style={{ minHeight: '100vh', background: C.bg }} />}><ForgotPasswordScreen onBack={() => setAuthScreen('login')} /></Suspense>;
    if (authScreen === 'onboarding') return <Onboarding  onComplete={data => { setUser({ ...data, state: data.states?.join(', '), role: 'owner', companyCode: 'TV-' + Math.random().toString(36).slice(2,8).toUpperCase() }); setAuthScreen(null); }} />;
    return <LoginScreen onLogin={u => { setUser(u); setAuthScreen(null); }} onSignup={() => setAuthScreen('signup')} onJoin={() => setAuthScreen('join')} onForgot={() => setAuthScreen('forgot')} />;
  }

  const handleConvertToInvoice = async (quote, client) => {
    const today = new Date().toISOString().split('T')[0];
    const draft = {
      number: nextInvNum(),
      clientId:      client?.id     || null,
      clientName:    client?.name    || quote.clientName    || '',
      clientEmail:   client?.email   || quote.clientEmail   || '',
      clientPhone:   client?.phone   || quote.clientPhone   || '',
      clientAddress: client?.address || quote.clientAddress || '',
      title:    quote.title,
      trade:    quote.trade,
      status:   'draft',
      terms:    quote.terms || 'Net 30',
      createdAt: today,
      dueAt:    '',
      paidAt:   null,
      labor:     quote.labor     || [],
      materials: quote.materials || [],
      equipment: quote.equipment || [],
      markup:    quote.markup,
      tax:       quote.tax,
      notes:     `Converted from ${quote.number}`,
      payments:  [],
      activity:  [
        { date: today, type: 'created', note: `Invoice created from quote ${quote.number}` },
      ],
    };
    try {
      const saved = await persistInvoice(draft);
      setPendingInvoiceId(saved.id);
      setSection('invoice');
    } catch (e) {
      alert(e?.message || 'Could not create invoice from quote.');
    }
  };

  const content = {
    dashboard: <Dashboard    user={user} nav={setSection} invoices={sharedInvoices} />,
    invoice:   <VoiceInvoice user={user} logo={logo} payments={payments} taxRates={taxRates} sharedInvoices={sharedInvoices} setSharedInvoices={setSharedInvoices} persistInvoice={persistInvoice} pendingInvoiceId={pendingInvoiceId} clearPendingInvoice={() => setPendingInvoiceId(null)} />,
    billing:   <Billing      user={user} payments={payments} />,
    quotes:    <Quotes       user={user} logo={logo} taxRates={taxRates} onConvertToInvoice={handleConvertToInvoice} />,
    schedule:  <ScheduleScreen user={user} team={teamMembers} />,
    clients:   <Clients      user={user} nav={setSection} />,
    marketing: <MarketingScreen />,
    settings:  <Settings     user={user} setUser={setUser} logo={logo} onLogoChange={setLogo} showProfileModal={showProfileModal} setShowProfileModal={setShowProfileModal} payments={payments} setPayments={setPaymentsPersist} taxRates={taxRates} setTaxRates={setTaxRatesPersist} teamMembers={teamMembers} setTeamMembers={setTeamMembers} persistTeamMember={persistTeamMember} removeTeamMember={removeTeamMember} />,
    privacy:   <PrivacyPolicyScreen onBack={() => setSection('settings')} />,
    terms:     <TermsScreen onBack={() => setSection('settings')} />,
  }[section];

  // ── Shared top bar: logo absolutely centered, settings menu top-right ──────
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const TOP_H = 108;

  // Free-trial countdown — 28-day trial starting at profile.createdAt.
  // If we don't have a createdAt (older accounts), we just say "Free trial".
  const trialInfo = (() => {
    if (!user.createdAt) return { label: 'Free Trial', expired: false };
    const start = new Date(user.createdAt);
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    const left = 28 - days;
    if (left > 0) return { label: `${left} day${left === 1 ? '' : 's'} left in trial`, expired: false };
    return { label: 'Trial ended — add card', expired: true };
  })();

  const TopBar = (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: TOP_H, background: C.surface,
      borderBottom: `1px solid ${C.border}`,
      boxShadow: '0 1px 0 rgba(15, 23, 42, 0.02), 0 4px 16px rgba(15, 23, 42, 0.03)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px',
    }}>
      {/* Logo — centered via flex justifyContent on parent */}
      <div onClick={() => setSection('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <Logo size={isTablet ? 40 : 44} />
      </div>

      {/* Trial countdown pill — bolder, gradient-filled */}
      <div style={{ position: 'absolute', top: 0, right: 70, height: TOP_H, display: 'flex', alignItems: 'center' }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '7px 14px', borderRadius: 20,
          background: trialInfo.expired
            ? `linear-gradient(135deg, ${C.errorBold} 0%, ${C.error} 100%)`
            : `linear-gradient(135deg, ${C.accent} 0%, #c2410c 100%)`,
          color: '#ffffff',
          border: 'none',
          boxShadow: trialInfo.expired
            ? '0 2px 6px rgba(185, 28, 28, 0.35)'
            : '0 2px 6px rgba(234, 88, 12, 0.3)',
          whiteSpace: 'nowrap',
        }}>
          {trialInfo.label}
        </span>
      </div>

      {/* Settings/profile button — pinned to top right */}
      <div style={{ position: 'absolute', top: 0, right: 14, height: TOP_H, display: 'flex', alignItems: 'center' }}>
        <button onClick={() => setShowProfileMenu(m => !m)} aria-label="Open settings menu" style={{
          width: 42, height: 42, borderRadius: '50%',
          background: showProfileMenu ? C.orangeLo : C.orange,
          border: showProfileMenu ? `2px solid ${C.orange}` : 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s',
        }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 900, color: showProfileMenu ? C.orange : '#fff', letterSpacing: '0.04em' }}>
            {initials}
          </span>
        </button>

        {showProfileMenu && (
          <div style={{
            position: 'absolute', top: TOP_H - 4, right: 0, width: 220,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, boxShadow: '0 8px 32px #00000022', zIndex: 999, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, background: C.raised }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name || 'Account'}</div>
              {user.email && <div style={{ fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>}
              {user.trades?.length > 0 && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{user.trades.join(' · ')}</div>}
            </div>
            {[
              { label: 'Settings',     action: () => { setSection('settings'); setShowProfileMenu(false); } },
              { label: 'Edit Profile', action: () => { setSection('settings'); setShowProfileModal(true); setShowProfileMenu(false); } },
              { label: 'Sign Out',     action: async () => { setShowProfileMenu(false); try { await signOut(); } catch (e) { console.error('signOut failed', e); } setUser(null); setAuthScreen('login'); }, danger: true },
            ].map((item, i, arr) => (
              <button key={item.label} onClick={item.action} style={{
                width: '100%', padding: '11px 14px', background: 'transparent', border: 'none',
                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                textAlign: 'left', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: item.danger ? C.error : C.text,
                fontFamily: "'Inter', sans-serif",
                WebkitTapHighlightColor: 'transparent',
              }}>{item.label}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Outside-click overlay for the settings menu
  const MenuOverlay = showProfileMenu && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setShowProfileMenu(false)} />
  );

  // ── TABLET: top bar + scrollable body + bottom tab nav ─────────────────────
  if (isTablet) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
        {TopBar}
        {MenuOverlay}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 16px', paddingBottom: BOTTOM_H + 20 }}>
          <Suspense fallback={<div style={{ padding: 24, color: C.dim, fontSize: 13 }}>Loading…</div>}>{content}</Suspense>
        </div>

        {/* Bottom nav — oval pill buttons */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: BOTTOM_H, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 10px', zIndex: 100 }}>
          {NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)} style={{
                flex: 1,
                padding: '9px 8px',
                borderRadius: 10,
                background: active ? C.orange : 'transparent',
                border: 'none',
                color: active ? '#fff' : C.muted,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                transition: 'background 0.15s, color 0.15s',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: active ? '0 1px 2px rgba(45, 106, 79, 0.2)' : 'none',
              }}>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── LAPTOP: top bar + sidebar (nav only) + content ─────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      {TopBar}
      {MenuOverlay}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Sidebar — nav only (logo and profile now live in the top bar) */}
        <div style={{ width: 210, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'sticky', top: TOP_H, height: `calc(100vh - ${TOP_H}px)`, flexShrink: 0 }}>
          <nav style={{ flex: 1, padding: '20px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV.map(item => {
              const active = section === item.id;
              return (
                <button key={item.id} onClick={() => setSection(item.id)} style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: active ? C.orange : 'transparent',
                  border: 'none',
                  color: active ? '#fff' : C.muted,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '-0.005em',
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: active ? '0 1px 2px rgba(45, 106, 79, 0.2)' : 'none',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.orangeLo; e.currentTarget.style.color = C.orange; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ flex: 1, padding: '36px 40px', overflowY: 'auto', minWidth: 0 }}>
          <Suspense fallback={<div style={{ padding: 24, color: C.dim, fontSize: 13 }}>Loading…</div>}>{content}</Suspense>
        </div>
      </div>
    </div>
  );
}
