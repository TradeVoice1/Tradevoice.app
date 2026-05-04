import React from "react";

// ─── IMPROVED ONBOARDING SCREEN ─────────────────────────────────────────────
// Replace the existing Onboarding component in App.jsx with this one
// 6 steps: Welcome → Business Info → Trade Selection → License → Payment → Done

export function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(1);
  const companyCode = React.useMemo(() => 'TV-' + Math.random().toString(36).substr(2, 6).toUpperCase(), []);
  const TOTAL_STEPS = 6;

  const [data, setData] = React.useState({
    businessName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: 'Texas',
    zip: '',
    trades: [],
    workType: 'Both',
    licenseNumber: '',
    tagline: '',
    plan: 'solo',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const TRADES = ['Plumber', 'Electrician', 'HVAC', 'Roofing', 'Specialty'];
  const STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.'];

  const PLANS = [
    { id: 'solo', name: 'Solo', price: '$49.99/mo', desc: '1 trade, perfect for solo contractors' },
    { id: 'pro', name: 'Pro', price: '$99.99/mo', desc: 'Up to 3 trades, ideal for growing businesses' },
    { id: 'all', name: 'All Trades', price: '$149.99/mo', desc: 'All 5 trades, unlimited potential' },
  ];

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { fontSize: 15, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' },
    stepText: { fontSize: 13, color: '#aaa' },
    progress: { height: 3, background: '#e8e8e8' },
    progressFill: { height: 3, background: '#2d6a4f', transition: 'width .3s ease', width: `${(step / TOTAL_STEPS) * 100}%` },
    body: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '36px', width: '100%', maxWidth: 480 },
    stepLabel: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#2d6a4f', marginBottom: 8 },
    h1: { fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 8 },
    sub: { fontSize: 14, color: '#888', marginBottom: 28, lineHeight: 1.6 },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', marginBottom: 16 },
    select: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', marginBottom: 16, background: '#fff' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
    tradeBtn: (active) => ({ padding: '12px 10px', border: active ? '2px solid #2d6a4f' : '1px solid #ddd', borderRadius: 8, background: active ? '#f0f7f4' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: active ? 700 : 400, color: active ? '#2d6a4f' : '#444', textAlign: 'center', transition: 'all .15s' }),
    planCard: (active) => ({ padding: '16px', border: active ? '2px solid #2d6a4f' : '1px solid #ddd', borderRadius: 10, background: active ? '#f0f7f4' : '#fff', cursor: 'pointer', marginBottom: 12, transition: 'all .15s' }),
    planName: (active) => ({ fontSize: 15, fontWeight: 700, color: active ? '#2d6a4f' : '#111' }),
    planPrice: { fontSize: 20, fontWeight: 900, color: '#111', margin: '2px 0' },
    planDesc: { fontSize: 13, color: '#888' },
    btn: { width: '100%', padding: '14px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
    btnOutline: { width: '100%', padding: '13px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer', marginTop: 8 },
    trialBadge: { background: '#f0f7f4', border: '1px solid #a7d9be', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#2d6a4f', textAlign: 'center', marginBottom: 20, fontWeight: 600 },
    disclaimer: { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 12, lineHeight: 1.6 },
  };

  const toggleTrade = (trade) => {
    setData(prev => ({
      ...prev,
      trades: prev.trades.includes(trade)
        ? prev.trades.filter(t => t !== trade)
        : [...prev.trades, trade]
    }));
  };

  // Step 1 — Welcome
  if (step === 1) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>Step {step} of {TOTAL_STEPS}</span></div>
      <div style={s.progress}><div style={s.progressFill} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.stepLabel}>Welcome</div>
          <div style={s.h1}>Let's get your account set up</div>
          <div style={s.sub}>It only takes a few minutes. We'll collect your business info, pick your trades, and get you ready to send your first invoice.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {['Set up your business profile','Select your trades','Add your license info','Start your 28-day free trial'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#2d6a4f', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <span style={{ fontSize: 14, color: '#444' }}>{item}</span>
              </div>
            ))}
          </div>
          <button style={s.btn} onClick={() => setStep(2)}>Get Started →</button>
        </div>
      </div>
    </div>
  );

  // Step 2 — Business Info
  if (step === 2) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>Step {step} of {TOTAL_STEPS}</span></div>
      <div style={s.progress}><div style={s.progressFill} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.stepLabel}>Business Info</div>
          <div style={s.h1}>Tell us about your business</div>
          <div style={s.sub}>This appears on your invoices and quotes.</div>
          <label style={s.label}>Business Name</label>
          <input style={s.input} placeholder="Burke's Mechanical LLC" value={data.businessName} onChange={e => update('businessName', e.target.value)} />
          <label style={s.label}>Your Name</label>
          <input style={s.input} placeholder="Matthew Burke" value={data.ownerName} onChange={e => update('ownerName', e.target.value)} />
          <label style={s.label}>Phone Number</label>
          <input style={s.input} placeholder="(713) 555-0100" value={data.phone} onChange={e => update('phone', e.target.value)} />
          <label style={s.label}>Business Address</label>
          <input style={s.input} placeholder="123 Main St" value={data.address} onChange={e => update('address', e.target.value)} />
          <div style={s.row}>
            <div>
              <label style={s.label}>City</label>
              <input style={s.input} placeholder="Houston" value={data.city} onChange={e => update('city', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Zip</label>
              <input style={s.input} placeholder="77001" value={data.zip} onChange={e => update('zip', e.target.value)} />
            </div>
          </div>
          <label style={s.label}>State</label>
          <select style={s.select} value={data.state} onChange={e => update('state', e.target.value)}>
            {STATES.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <button style={s.btn} onClick={() => setStep(3)}>Continue →</button>
          <button style={s.btnOutline} onClick={() => setStep(1)}>← Back</button>
        </div>
      </div>
    </div>
  );

  // Step 3 — Trade Selection
  if (step === 3) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>Step {step} of {TOTAL_STEPS}</span></div>
      <div style={s.progress}><div style={s.progressFill} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.stepLabel}>Your Trades</div>
          <div style={s.h1}>What trades do you work in?</div>
          <div style={s.sub}>Select all that apply. Your plan price is based on the number of trades you select.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {TRADES.map(trade => (
              <button key={trade} style={s.tradeBtn(data.trades.includes(trade))} onClick={() => toggleTrade(trade)}>{trade}</button>
            ))}
          </div>
          <label style={s.label}>Work Type</label>
          <select style={s.select} value={data.workType} onChange={e => update('workType', e.target.value)}>
            <option>Residential</option>
            <option>Commercial</option>
            <option>Both</option>
          </select>
          {data.trades.length > 0 && (
            <div style={{ background: '#f0f7f4', border: '1px solid #a7d9be', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#2d6a4f', marginBottom: 16 }}>
              {data.trades.length === 1 ? '1 trade selected — Solo plan ($49.99/mo)' : data.trades.length <= 3 ? `${data.trades.length} trades selected — Pro plan ($99.99/mo)` : `${data.trades.length} trades selected — All Trades plan ($149.99/mo)`}
            </div>
          )}
          <button style={s.btn} onClick={() => setStep(4)} disabled={data.trades.length === 0}>Continue →</button>
          <button style={s.btnOutline} onClick={() => setStep(2)}>← Back</button>
        </div>
      </div>
    </div>
  );

  // Step 4 — License Info
  if (step === 4) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>Step {step} of {TOTAL_STEPS}</span></div>
      <div style={s.progress}><div style={s.progressFill} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.stepLabel}>License Info</div>
          <div style={s.h1}>Add your license number</div>
          <div style={s.sub}>This appears on your invoices and quotes, building trust with your clients. You can skip this and add it later in Settings.</div>
          <label style={s.label}>Contractor License Number</label>
          <input style={s.input} placeholder="e.g. M-42817" value={data.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} />
          <label style={s.label}>Business Tagline (optional)</label>
          <input style={s.input} placeholder="Licensed & Insured · Serving TX & LA" value={data.tagline} onChange={e => update('tagline', e.target.value)} />
          <button style={s.btn} onClick={() => setStep(5)}>Continue →</button>
          <button style={s.btnOutline} onClick={() => setStep(3)}>← Back</button>
        </div>
      </div>
    </div>
  );

  // Step 5 — Plan + Payment
  if (step === 5) return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>Step {step} of {TOTAL_STEPS}</span></div>
      <div style={s.progress}><div style={s.progressFill} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.stepLabel}>Your Plan</div>
          <div style={s.h1}>Start your free trial</div>
          <div style={s.trialBadge}>28 days free — no charge until your trial ends</div>
          {PLANS.map(plan => (
            <div key={plan.id} style={s.planCard(data.plan === plan.id)} onClick={() => update('plan', plan.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={s.planName(data.plan === plan.id)}>{plan.name}</div>
                  <div style={s.planDesc}>{plan.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.planPrice}>{plan.price}</div>
                  {data.plan === plan.id && <div style={{ fontSize: 12, color: '#2d6a4f', fontWeight: 700 }}>✓ Selected</div>}
                </div>
              </div>
            </div>
          ))}
          <label style={{ ...s.label, marginTop: 8 }}>Card Number</label>
          <input style={s.input} placeholder="1234 5678 9012 3456" value={data.cardNumber} onChange={e => update('cardNumber', e.target.value)} />
          <div style={s.row}>
            <div>
              <label style={s.label}>Expiry</label>
              <input style={s.input} placeholder="MM/YY" value={data.cardExpiry} onChange={e => update('cardExpiry', e.target.value)} />
            </div>
            <div>
              <label style={s.label}>CVC</label>
              <input style={s.input} placeholder="123" value={data.cardCvc} onChange={e => update('cardCvc', e.target.value)} />
            </div>
          </div>
          <div style={s.disclaimer}>Your card will not be charged for 28 days. Cancel anytime before your trial ends and you won't be billed.</div>
          <button style={s.btn} onClick={() => setStep(6)}>Start Free Trial →</button>
          <button style={s.btnOutline} onClick={() => setStep(4)}>← Back</button>
        </div>
      </div>
    </div>
  );

  // Step 6 — Done
  return (
    <div style={s.wrap}>
      <div style={s.header}><span style={s.logo}>TRADEVOICE</span><span style={s.stepText}>All done!</span></div>
      <div style={s.progress}><div style={{ ...s.progressFill, width: '100%' }} /></div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111', marginBottom: 8 }}>You're all set!</div>
            <div style={{ fontSize: 15, color: '#666', lineHeight: 1.7 }}>
              Welcome to TradeVoice, <strong>{data.ownerName || 'there'}</strong>. Your account is ready. Start by creating your first invoice or quote.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={s.btn} onClick={() => onComplete(data)}>Go to Dashboard →</button>
          </div>
          <div style={{ marginTop: 20, padding: '16px', background: '#f7f7f5', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>Your Company Code</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#2d6a4f', letterSpacing: '.1em' }}>{companyCode}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Share this with your technicians so they can join your account</div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default OnboardingScreen;
