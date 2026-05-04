import React, { useState } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const C = {
  green: '#2d6a4f',
  greenLight: '#f0f7f4',
  greenBorder: '#a7d9be',
};

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const SAMPLE_CLIENTS = [
  { id: 1, name: 'John Miller', email: 'john.miller@email.com', phone: '(713) 555-0100', lastJob: 'Apr 7, 2025', trade: 'Plumber', totalSpent: 358.78, reviewed: false },
  { id: 2, name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '(713) 555-0200', lastJob: 'Apr 8, 2025', trade: 'HVAC', totalSpent: 245.00, reviewed: true },
  { id: 3, name: 'Robert Chen', email: 'r.chen@email.com', phone: '(713) 555-0300', lastJob: 'Apr 9, 2025', trade: 'Electrician', totalSpent: 892.50, reviewed: false },
  { id: 4, name: 'Lisa Williams', email: 'lwilliams@email.com', phone: '(713) 555-0400', lastJob: 'Mar 15, 2025', trade: 'Roofing', totalSpent: 4200.00, reviewed: true },
  { id: 5, name: 'Mike Davis', email: 'mike.d@email.com', phone: '(713) 555-0500', lastJob: 'Feb 20, 2025', trade: 'Plumber', totalSpent: 575.00, reviewed: false },
  { id: 6, name: 'Jennifer Kim', email: 'jkim@email.com', phone: '(713) 555-0600', lastJob: 'Jan 10, 2025', trade: 'HVAC', totalSpent: 1200.00, reviewed: false },
];

const SAMPLE_CAMPAIGNS = [
  { id: 1, name: 'Spring AC Tune-Up Special', status: 'sent', sent: 45, opened: 28, clicked: 12, date: 'Apr 1, 2025', trade: 'HVAC' },
  { id: 2, name: 'Annual Plumbing Checkup', status: 'draft', sent: 0, opened: 0, clicked: 0, date: 'Apr 10, 2025', trade: 'Plumber' },
  { id: 3, name: 'Storm Damage Roof Inspection', status: 'sent', sent: 38, opened: 22, clicked: 9, date: 'Mar 20, 2025', trade: 'Roofing' },
];

const SAMPLE_AUTOMATIONS = [
  { id: 1, name: 'Review Request', trigger: 'Job marked complete', delay: '1 day after', status: 'active', sent: 23, converted: 8 },
  { id: 2, name: 'Quote Follow-up', trigger: 'Quote sent, not accepted', delay: '3 days after', status: 'active', sent: 15, converted: 4 },
  { id: 3, name: 'Annual Maintenance Reminder', trigger: '1 year after last job', delay: '12 months after', status: 'active', sent: 12, converted: 6 },
  { id: 4, name: 'Thank You + Referral Ask', trigger: 'Invoice paid', delay: '2 days after', status: 'paused', sent: 31, converted: 3 },
];

// ─── REVIEW REQUEST MODAL ─────────────────────────────────────────────────────
function ReviewRequestModal({ clients, onClose, onSend }) {
  const [selected, setSelected] = useState([]);
  const [sent, setSent] = useState(false);
  const unreviewedClients = clients.filter(c => !c.reviewed);

  const toggleSelect = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSend = () => {
    setSent(true);
    setTimeout(() => { onSend(selected); onClose(); }, 1500);
  };

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    clientRow: (sel) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 8, border: `1px solid ${sel ? C.greenBorder : '#e8e8e8'}`, background: sel ? C.greenLight : '#fff', cursor: 'pointer', marginBottom: 8 }),
    checkbox: (sel) => ({ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? C.green : '#ddd'}`, background: sel ? C.green : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }),
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? C.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  };

  if (sent) return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111', marginBottom: 8 }}>Review requests sent!</div>
        <div style={{ fontSize: 15, color: '#666' }}>Sent to {selected.length} client{selected.length !== 1 ? 's' : ''}. We'll notify you when they leave a review.</div>
      </div>
    </div>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Send Review Requests</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
            Select clients to send a Google review request. Only clients who haven't reviewed yet are shown.
          </div>
          <div style={{ background: '#f7f7f5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#555', lineHeight: 1.6 }}>
            <strong>Preview message:</strong> "Hi [Name], thank you for choosing us! If you had a great experience, we'd really appreciate a Google review — it helps other homeowners find us. [Link]"
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{unreviewedClients.length} clients without a review</span>
            <button style={{ background: 'none', border: 'none', color: C.green, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelected(unreviewedClients.map(c => c.id))}>Select All</button>
          </div>
          {unreviewedClients.map(client => {
            const sel = selected.includes(client.id);
            return (
              <div key={client.id} style={s.clientRow(sel)} onClick={() => toggleSelect(client.id)}>
                <div style={s.checkbox(sel)}>{sel && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{client.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{client.email} · Last job: {client.lastJob}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={s.footer}>
          <button style={s.btn(false)} onClick={onClose}>Cancel</button>
          <button style={s.btn(true)} onClick={handleSend} disabled={selected.length === 0}>
            Send to {selected.length} Client{selected.length !== 1 ? 's' : ''} →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW CAMPAIGN MODAL ───────────────────────────────────────────────────────
function NewCampaignModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', trade: 'All', subject: '', message: '', schedule: 'now' });
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const TEMPLATES = [
    { id: 1, name: 'Spring AC Tune-Up', trade: 'HVAC', subject: "Time for your spring AC tune-up!", message: "Hi [Name],\n\nSpring is here and it's the perfect time to make sure your AC is ready for summer. We're offering a special spring tune-up service — catch problems early before the heat kicks in.\n\nCall or reply to this email to schedule your appointment.\n\nThanks,\n[Your Company]" },
    { id: 2, name: 'Annual Plumbing Check', trade: 'Plumber', subject: "Is your plumbing ready for the year ahead?", message: "Hi [Name],\n\nIt's been a year since we last serviced your plumbing. A quick annual checkup can catch small problems before they become big ones.\n\nReply or call us to schedule — we'll get you taken care of.\n\n[Your Company]" },
    { id: 3, name: 'Roof Storm Check', trade: 'Roofing', subject: "Has recent storm weather affected your roof?", message: "Hi [Name],\n\nRecent storms in the area can cause roof damage that isn't always visible from the ground. We're offering free post-storm inspections this month.\n\nDon't wait until a small issue becomes a big leak. Call or reply to book your free inspection.\n\n[Your Company]" },
    { id: 4, name: 'Referral Request', trade: 'All', subject: "Know someone who needs a great contractor?", message: "Hi [Name],\n\nWe loved working with you and hope you've been happy with our work. If you know anyone who needs a reliable contractor, we'd really appreciate the referral.\n\nAs a thank you, we'll give you $25 off your next service for every referral that books with us.\n\nThanks so much,\n[Your Company]" },
  ];

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modal: { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
    header: { background: C.green, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0 },
    body: { padding: '20px 24px' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block', marginTop: 14 },
    input: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    select: { width: '100%', padding: '11px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' },
    textarea: { width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', height: 160, resize: 'vertical', lineHeight: 1.7 },
    templateCard: (active) => ({ padding: '14px', border: `1px solid ${active ? C.green : '#e8e8e8'}`, borderRadius: 10, cursor: 'pointer', marginBottom: 10, background: active ? C.greenLight : '#fff' }),
    footer: { padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: '#fff' },
    btn: (primary) => ({ flex: 1, padding: '12px', borderRadius: 8, border: primary ? 'none' : '1px solid #ddd', background: primary ? C.green : '#fff', color: primary ? '#fff' : '#666', fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{step === 1 ? 'Choose a Template' : 'Customize Campaign'}</span>
          <button style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }} onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div style={s.body}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Pick a starting template or start from scratch.</div>
            {TEMPLATES.map(t => (
              <div key={t.id} style={s.templateCard(form.name === t.name)} onClick={() => { update('name', t.name); update('subject', t.subject); update('message', t.message); update('trade', t.trade); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{t.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: C.greenLight, padding: '2px 8px', borderRadius: 4 }}>{t.trade}</span>
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>{t.subject}</div>
              </div>
            ))}
            <div style={s.templateCard(form.name === 'custom')} onClick={() => { update('name', 'custom'); update('subject', ''); update('message', ''); }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Start from scratch</div>
              <div style={{ fontSize: 13, color: '#888' }}>Write your own subject and message</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={s.body}>
            <label style={s.label}>Campaign Name</label>
            <input style={s.input} value={form.name === 'custom' ? '' : form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Spring HVAC Special" />
            <label style={s.label}>Send To</label>
            <select style={s.select} value={form.trade} onChange={e => update('trade', e.target.value)}>
              <option value="All">All Clients</option>
              <option value="Plumber">Plumbing Clients Only</option>
              <option value="HVAC">HVAC Clients Only</option>
              <option value="Electrician">Electrical Clients Only</option>
              <option value="Roofing">Roofing Clients Only</option>
            </select>
            <label style={s.label}>Email Subject</label>
            <input style={s.input} value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="Subject line..." />
            <label style={s.label}>Message</label>
            <textarea style={s.textarea} value={form.message} onChange={e => update('message', e.target.value)} placeholder="Write your message here. Use [Name] to personalize." />
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Use [Name] to insert the client's first name automatically.</div>
            <label style={s.label}>Schedule</label>
            <select style={s.select} value={form.schedule} onChange={e => update('schedule', e.target.value)}>
              <option value="now">Send immediately</option>
              <option value="tomorrow">Tomorrow morning (8 AM)</option>
              <option value="monday">Next Monday (8 AM)</option>
            </select>
          </div>
        )}

        <div style={s.footer}>
          {step === 2 ? (
            <>
              <button style={s.btn(false)} onClick={() => setStep(1)}>← Back</button>
              <button style={s.btn(true)} onClick={() => { onSave(form); onClose(); }}>
                {form.schedule === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
              </button>
            </>
          ) : (
            <>
              <button style={s.btn(false)} onClick={onClose}>Cancel</button>
              <button style={s.btn(true)} onClick={() => setStep(2)} disabled={!form.name}>Continue →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN MARKETING SCREEN ────────────────────────────────────────────────────
export default function MarketingScreen() {
  const [tab, setTab] = useState('overview'); // overview | reviews | campaigns | automations | clients
  const [clients, setClients] = useState(SAMPLE_CLIENTS);
  const [campaigns, setCampaigns] = useState(SAMPLE_CAMPAIGNS);
  const [automations, setAutomations] = useState(SAMPLE_AUTOMATIONS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const totalReviews = clients.filter(c => c.reviewed).length;
  const totalClients = clients.length;
  const pendingReviews = totalClients - totalReviews;
  const activeAutomations = automations.filter(a => a.status === 'active').length;
  const totalCampaignsSent = campaigns.filter(c => c.status === 'sent').length;

  const handleReviewSend = (ids) => {
    setClients(prev => prev.map(c => ids.includes(c.id) ? { ...c, reviewed: true } : c));
  };

  const handleSaveCampaign = (form) => {
    setCampaigns(prev => [...prev, { id: Date.now(), name: form.name, status: form.schedule === 'now' ? 'sent' : 'scheduled', sent: form.schedule === 'now' ? SAMPLE_CLIENTS.length : 0, opened: 0, clicked: 0, date: new Date().toLocaleDateString(), trade: form.trade }]);
  };

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: a.status === 'active' ? 'paused' : 'active' } : a));
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 800, color: '#111' },
    tabs: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' },
    tab: (active) => ({ padding: '12px 16px', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? C.green : '#888', borderBottom: `2px solid ${active ? C.green : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', background: 'none', border: 'none', borderBottom: `2px solid ${active ? C.green : 'transparent'}` }),
    body: { padding: '24px 20px', maxWidth: 900, margin: '0 auto' },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
    statCard: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '20px', textAlign: 'center' },
    statNum: { fontSize: 32, fontWeight: 900, color: '#111', marginBottom: 4 },
    statLabel: { fontSize: 13, color: '#888' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 20 },
    cardHeader: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 15, fontWeight: 700, color: '#111' },
    addBtn: { padding: '8px 14px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    tableHead: { display: 'grid', padding: '10px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#aaa', background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
    tableRow: { display: 'grid', padding: '14px 20px', borderBottom: '1px solid #f8f8f8', alignItems: 'center' },
    badge: (color, bg) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color, background: bg }),
    toggleBtn: (active) => ({ padding: '6px 12px', borderRadius: 20, border: 'none', background: active ? '#dcfce7' : '#f3f4f6', color: active ? '#166534' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }),
    emptyState: { padding: '40px 20px', textAlign: 'center', color: '#aaa' },
  };

  const renderOverview = () => (
    <>
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalReviews}</div>
          <div style={s.statLabel}>Google Reviews</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: pendingReviews > 0 ? '#f59e0b' : '#10b981' }}>{pendingReviews}</div>
          <div style={s.statLabel}>Pending Reviews</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalCampaignsSent}</div>
          <div style={s.statLabel}>Campaigns Sent</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: C.green }}>{activeAutomations}</div>
          <div style={s.statLabel}>Active Automations</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '⭐', title: 'Request Reviews', desc: `${pendingReviews} clients haven't reviewed yet`, action: () => setShowReviewModal(true), btnText: 'Send Requests' },
          { icon: '📧', title: 'New Campaign', desc: 'Send a promotion to your clients', action: () => setShowCampaignModal(true), btnText: 'Create Campaign' },
          { icon: '⚡', title: 'Automations', desc: `${activeAutomations} automations running`, action: () => setTab('automations'), btnText: 'Manage' },
        ].map((item, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '20px' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>{item.desc}</div>
            <button style={{ padding: '9px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }} onClick={item.action}>{item.btnText}</button>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={s.card}>
        <div style={s.cardHeader}><span style={s.cardTitle}>Recent Activity</span></div>
        {[
          { icon: '⭐', text: 'John Miller left a 5-star Google review', time: '2 hours ago', color: '#f59e0b' },
          { icon: '📧', text: 'Spring AC Tune-Up campaign sent to 45 clients', time: '3 days ago', color: C.green },
          { icon: '💬', text: 'Review request sent to 5 clients', time: '1 week ago', color: '#3b82f6' },
          { icon: '⚡', text: 'Annual Maintenance Reminder automation sent to 3 clients', time: '2 weeks ago', color: '#8b5cf6' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f8f8f8' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1, fontSize: 14, color: '#333' }}>{item.text}</div>
            <div style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>{item.time}</div>
          </div>
        ))}
      </div>
    </>
  );

  const renderReviews = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40 }}>⭐</div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>{totalReviews}</div>
            <div style={{ fontSize: 14, color: C.green }}>Google Reviews</div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b' }}>{pendingReviews}</div>
            <div style={{ fontSize: 14, color: '#888' }}>Clients without a review</div>
          </div>
          <button style={{ padding: '10px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowReviewModal(true)}>
            Request Reviews
          </button>
        </div>
      </div>
      <div style={s.card}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '1fr 1.5fr 1fr 80px' }}>
          <span>Client</span><span>Last Job</span><span>Trade</span><span>Review</span>
        </div>
        {clients.map(client => (
          <div key={client.id} style={{ ...s.tableRow, gridTemplateColumns: '1fr 1.5fr 1fr 80px' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{client.name}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{client.email}</div>
            </div>
            <div style={{ fontSize: 14, color: '#555' }}>{client.lastJob}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{client.trade}</div>
            <div>{client.reviewed
              ? <span style={s.badge('#166534', '#dcfce7')}>⭐ Done</span>
              : <span style={s.badge('#b45309', '#fef9c3')}>Pending</span>
            }</div>
          </div>
        ))}
      </div>
    </>
  );

  const renderCampaigns = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button style={{ padding: '10px 18px', background: C.green, color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowCampaignModal(true)}>
          + New Campaign
        </button>
      </div>
      <div style={s.card}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 80px 80px 80px 80px' }}>
          <span>Campaign</span><span>Date</span><span>Sent</span><span>Opened</span><span>Clicked</span><span>Status</span>
        </div>
        {campaigns.map(c => (
          <div key={c.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 80px 80px 80px 80px' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{c.trade}</div>
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>{c.date}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{c.sent}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{c.opened > 0 ? `${Math.round(c.opened/c.sent*100)}%` : '—'}</div>
            <div style={{ fontSize: 14, color: '#555' }}>{c.clicked > 0 ? `${Math.round(c.clicked/c.sent*100)}%` : '—'}</div>
            <div>
              {c.status === 'sent' && <span style={s.badge('#166534', '#dcfce7')}>Sent</span>}
              {c.status === 'draft' && <span style={s.badge('#6b7280', '#f3f4f6')}>Draft</span>}
              {c.status === 'scheduled' && <span style={s.badge('#1d4ed8', '#eff6ff')}>Scheduled</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderAutomations = () => (
    <>
      <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#2d6a4f', lineHeight: 1.6 }}>
        ⚡ Automations run in the background automatically. Once turned on, they send messages to your clients without you having to do anything.
      </div>
      <div style={s.card}>
        {automations.map(auto => (
          <div key={auto.id} style={{ padding: '18px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{auto.name}</span>
                <span style={s.badge(auto.status === 'active' ? '#166534' : '#6b7280', auto.status === 'active' ? '#dcfce7' : '#f3f4f6')}>
                  {auto.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
                Trigger: <strong style={{ color: '#555' }}>{auto.trigger}</strong> · Sends: <strong style={{ color: '#555' }}>{auto.delay}</strong>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ fontSize: 13 }}><span style={{ color: '#aaa' }}>Sent: </span><strong style={{ color: '#333' }}>{auto.sent}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: '#aaa' }}>Responded: </span><strong style={{ color: C.green }}>{auto.converted}</strong></div>
                {auto.sent > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#aaa' }}>Rate: </span><strong style={{ color: '#333' }}>{Math.round(auto.converted/auto.sent*100)}%</strong></div>}
              </div>
            </div>
            <button style={s.toggleBtn(auto.status === 'active')} onClick={() => toggleAutomation(auto.id)}>
              {auto.status === 'active' ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  const renderClients = () => (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardTitle}>All Clients — {clients.length}</span>
        <div style={{ fontSize: 13, color: '#888' }}>Total revenue: ${clients.reduce((s, c) => s + c.totalSpent, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
      <div style={{ ...s.tableHead, gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
        <span>Client</span><span>Contact</span><span>Last Job</span><span>Total Spent</span><span>Review</span>
      </div>
      {clients.map(client => (
        <div key={client.id} style={{ ...s.tableRow, gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr 80px' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{client.name}</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{client.trade}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#555' }}>{client.email}</div>
            <div style={{ fontSize: 12, color: '#aaa' }}>{client.phone}</div>
          </div>
          <div style={{ fontSize: 13, color: '#666' }}>{client.lastJob}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>${client.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div>{client.reviewed
            ? <span style={s.badge('#166534', '#dcfce7')}>⭐</span>
            : <span style={{ ...s.badge('#b45309', '#fef9c3'), cursor: 'pointer' }} onClick={() => setShowReviewModal(true)}>Ask</span>
          }</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.title}>Marketing</div>
        <div style={{ fontSize: 13, color: '#888' }}>Grow your business with reviews, campaigns & automations</div>
      </div>

      <div style={s.tabs}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'reviews', label: `Reviews (${totalReviews})` },
          { id: 'campaigns', label: 'Campaigns' },
          { id: 'automations', label: 'Automations' },
          { id: 'clients', label: `Clients (${totalClients})` },
        ].map(t => (
          <button key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={s.body}>
        {tab === 'overview' && renderOverview()}
        {tab === 'reviews' && renderReviews()}
        {tab === 'campaigns' && renderCampaigns()}
        {tab === 'automations' && renderAutomations()}
        {tab === 'clients' && renderClients()}
      </div>

      {showReviewModal && <ReviewRequestModal clients={clients} onClose={() => setShowReviewModal(false)} onSend={handleReviewSend} />}
      {showCampaignModal && <NewCampaignModal onClose={() => setShowCampaignModal(false)} onSave={handleSaveCampaign} />}
    </div>
  );
}
