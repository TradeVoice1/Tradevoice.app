import React, { useState } from "react";

// ─── CLIENT-FACING INVOICE PAYMENT PAGE ─────────────────────────────────────
// This is what the CLIENT sees when they click the payment link on their invoice
// Route: thetradevoice.com/pay/:invoiceId
// Shows invoice summary + payment options

export function InvoicePaymentPage({ invoice, contractor, onPaymentComplete }) {

  const [payMethod, setPayMethod] = React.useState('card'); // card | other
  const [status, setStatus] = React.useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvc, setCardCvc] = React.useState('');

  // Demo invoice data — replace with real props
  const inv = invoice || {
    number: 'INV-2025-0112',
    date: 'Apr 7, 2025',
    dueDate: 'Apr 22, 2025',
    subtotal: 349.25,
    tax: 3.38,
    markup: 6.15,
    total: 358.78,
    processingFee: 14.00,
    totalWithFee: 372.78,
    job: 'Kitchen sink repair & faucet replacement',
    status: 'unpaid',
  };

  const cttr = contractor || {
    name: 'Riverside Flow Services LLC',
    tagline: 'Licensed & Insured · TX & LA',
    phone: '(713) 555-0184',
    email: 'service@riversideflow.com',
    venmo: '@RiversideFlow',
    zelle: 'service@riversideflow.com',
  };

  const client = { name: 'John Miller', address: '2847 Magnolia Dr, Houston TX 77008' };

  const formatCard = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => val.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);

  const handlePay = () => {
    if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
      setErrorMsg('Please fill in all card details.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    // Simulate payment — replace with real Stripe call
    setTimeout(() => {
      setStatus('success');
      if (onPaymentComplete) onPaymentComplete();
    }, 2000);
  };

  const s = {
    wrap: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { fontSize: 15, fontWeight: 900, color: '#1b4332', letterSpacing: '.1em' },
    secure: { fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 },
    body: { maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' },
    // Invoice summary card
    invCard: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 20 },
    invHeader: { background: '#1b4332', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    invTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(255,255,255,.6)', marginBottom: 2 },
    invNum: { fontSize: 20, fontWeight: 900, color: '#fff' },
    invAmt: { textAlign: 'right' },
    invAmtLabel: { fontSize: 11, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.1em' },
    invAmtVal: { fontSize: 28, fontWeight: 900, color: '#fff' },
    invBody: { padding: '20px 24px' },
    invRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, color: '#666', borderBottom: '1px solid #f5f5f5' },
    invRowBold: { display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 15, fontWeight: 700, color: '#111' },
    badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 },
    // Contractor info
    cttrCard: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cttrName: { fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 2 },
    cttrTag: { fontSize: 13, color: '#888' },
    cttrContact: { fontSize: 13, color: '#888', textAlign: 'right' },
    // Payment section
    payCard: { background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', overflow: 'hidden', marginBottom: 20 },
    payHeader: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0', fontSize: 14, fontWeight: 700, color: '#111' },
    methodTabs: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #f0f0f0' },
    tab: (active) => ({ padding: '12px', textAlign: 'center', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#2d6a4f' : '#888', background: active ? '#f0f7f4' : '#fff', cursor: 'pointer', borderBottom: active ? '2px solid #2d6a4f' : '2px solid transparent' }),
    payBody: { padding: '20px' },
    label: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#888', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '12px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none', fontFamily: "'Inter', sans-serif", boxSizing: 'border-box', marginBottom: 14 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    feeNote: { background: '#f9f9f7', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 },
    payBtn: { width: '100%', padding: '16px', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', letterSpacing: '.04em' },
    payBtnLoading: { width: '100%', padding: '16px', background: '#a0c4b4', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'not-allowed' },
    error: { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#b91c1c', marginBottom: 14 },
    altMethod: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f5f5f5' },
    altLabel: { fontSize: 14, fontWeight: 600, color: '#333' },
    altVal: { fontSize: 14, color: '#2d6a4f', fontWeight: 600 },
    // Success
    successWrap: { textAlign: 'center', padding: '40px 20px' },
    successIcon: { fontSize: 56, marginBottom: 16 },
    successTitle: { fontSize: 24, fontWeight: 800, color: '#111', marginBottom: 8 },
    successText: { fontSize: 15, color: '#666', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' },
    successCard: { background: '#f0f7f4', border: '1px solid #a7d9be', borderRadius: 12, padding: '20px', marginTop: 24, textAlign: 'left' },
  };

  if (status === 'success') {
    return (
      <div style={s.wrap}>
        <div style={s.header}>
          <span style={s.logo}>TRADEVOICE</span>
          <span style={s.secure}>🔒 Secure Payment</span>
        </div>
        <div style={s.body}>
          <div style={s.successWrap}>
            <div style={s.successIcon}>✅</div>
            <div style={s.successTitle}>Payment received!</div>
            <div style={s.successText}>
              Your payment of <strong>${inv.totalWithFee.toFixed(2)}</strong> to <strong>{cttr.name}</strong> was processed successfully.
            </div>
            <div style={s.successCard}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2d6a4f', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em' }}>Payment Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444', marginBottom: 6 }}><span>Invoice</span><span>{inv.number}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444', marginBottom: 6 }}><span>Amount Paid</span><span>${inv.totalWithFee.toFixed(2)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}><span>Date</span><span>{new Date().toLocaleDateString()}</span></div>
            </div>
            <div style={{ fontSize: 13, color: '#aaa', marginTop: 20 }}>A receipt has been sent to your email address.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.logo}>TRADEVOICE</span>
        <span style={s.secure}>🔒 Secure Payment</span>
      </div>
      <div style={s.body}>

        {/* Invoice Summary */}
        <div style={s.invCard}>
          <div style={s.invHeader}>
            <div>
              <div style={s.invTitle}>Invoice</div>
              <div style={s.invNum}>{inv.number}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>Due {inv.dueDate}</div>
            </div>
            <div style={s.invAmt}>
              <div style={s.invAmtLabel}>Amount Due</div>
              <div style={s.invAmtVal}>${inv.totalWithFee.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>incl. processing fee</div>
            </div>
          </div>
          <div style={s.invBody}>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>Summary</div>
            <div style={s.invRow}><span>Job</span><span style={{ color: '#333', maxWidth: 200, textAlign: 'right' }}>{inv.job}</span></div>
            <div style={s.invRow}><span>Subtotal</span><span>${inv.subtotal.toFixed(2)}</span></div>
            <div style={s.invRow}><span>Materials markup</span><span>${inv.markup.toFixed(2)}</span></div>
            <div style={s.invRow}><span>Tax</span><span>${inv.tax.toFixed(2)}</span></div>
            <div style={s.invRow}><span>Processing fee (3.9% + $0.30)</span><span>${inv.processingFee.toFixed(2)}</span></div>
            <div style={s.invRowBold}><span>Total</span><span>${inv.totalWithFee.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Contractor Info */}
        <div style={s.cttrCard}>
          <div>
            <div style={s.cttrName}>{cttr.name}</div>
            <div style={s.cttrTag}>{cttr.tagline}</div>
          </div>
          <div style={s.cttrContact}>
            <div>{cttr.phone}</div>
            <div>{cttr.email}</div>
          </div>
        </div>

        {/* Payment */}
        <div style={s.payCard}>
          <div style={s.payHeader}>Pay Invoice {inv.number}</div>
          <div style={s.methodTabs}>
            <div style={s.tab(payMethod === 'card')} onClick={() => setPayMethod('card')}>💳 Card / ACH</div>
            <div style={s.tab(payMethod === 'other')} onClick={() => setPayMethod('other')}>Other Methods</div>
          </div>
          <div style={s.payBody}>
            {payMethod === 'card' ? (
              <>
                <div style={s.feeNote}>
                  A 3.9% + $0.30 processing fee is included in your total of <strong>${inv.totalWithFee.toFixed(2)}</strong>.
                </div>
                {status === 'error' && <div style={s.error}>{errorMsg}</div>}
                <label style={s.label}>Name on Card</label>
                <input style={s.input} placeholder="John Miller" value={cardName} onChange={e => setCardName(e.target.value)} />
                <label style={s.label}>Card Number</label>
                <input style={s.input} placeholder="1234 5678 9012 3456" value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} maxLength={19} />
                <div style={s.row2}>
                  <div>
                    <label style={s.label}>Expiry</label>
                    <input style={s.input} placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} maxLength={5} />
                  </div>
                  <div>
                    <label style={s.label}>CVC</label>
                    <input style={s.input} placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} />
                  </div>
                </div>
                <button style={status === 'loading' ? s.payBtnLoading : s.payBtn} onClick={handlePay} disabled={status === 'loading'}>
                  {status === 'loading' ? 'Processing...' : `Pay $${inv.totalWithFee.toFixed(2)}`}
                </button>
                <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 10 }}>🔒 Secured by Stripe</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Pay <strong>${inv.total.toFixed(2)}</strong> directly — no processing fee for these methods.</div>
                <div style={s.altMethod}>
                  <span style={s.altLabel}>Venmo</span>
                  <span style={s.altVal}>{cttr.venmo}</span>
                </div>
                <div style={s.altMethod}>
                  <span style={s.altLabel}>Zelle</span>
                  <span style={s.altVal}>{cttr.zelle}</span>
                </div>
                <div style={s.altMethod}>
                  <span style={s.altLabel}>Check</span>
                  <span style={{ fontSize: 14, color: '#666' }}>Payable to {cttr.name}</span>
                </div>
                <div style={s.altMethod}>
                  <span style={s.altLabel}>Cash</span>
                  <span style={{ fontSize: 14, color: '#666' }}>Contact contractor to arrange</span>
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 16, lineHeight: 1.6 }}>
                  Include invoice number <strong>{inv.number}</strong> in your payment note so we can match your payment.
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#ccc', textAlign: 'center', lineHeight: 1.7 }}>
          Powered by <strong style={{ color: '#2d6a4f' }}>TRADE</strong>VOICE · thetradevoice.com<br />
          Questions? Contact {cttr.email}
        </div>
      </div>
    </div>
  );
}
