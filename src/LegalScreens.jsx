import React, { useState } from "react";

// ─── PRIVACY POLICY SCREEN ──────────────────────────────────────────────────
export function PrivacyPolicyScreen({ onBack }) {
  const s = {
    container: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
    backBtn: { background: 'none', border: 'none', fontSize: 14, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', padding: '4px 0' },
    title: { fontSize: 18, fontWeight: 700, color: '#111' },
    body: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' },
    h1: { fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 4 },
    updated: { fontSize: 13, color: '#999', marginBottom: 32 },
    h2: { fontSize: 16, fontWeight: 700, color: '#111', marginTop: 28, marginBottom: 8 },
    p: { fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 12 },
    li: { fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 4 },
    contact: { background: '#f0f7f4', border: '1px solid #c8e6d4', borderRadius: 8, padding: '16px 20px', marginTop: 32 },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.title}>Privacy Policy</span>
      </div>
      <div style={s.body}>
        <div style={s.h1}>Privacy Policy</div>
        <div style={s.updated}>Last updated: April 8, 2026</div>

        <div style={s.h2}>1. Who We Are</div>
        <p style={s.p}>TradeVoice ("we," "us," or "our") is a software platform operated by TradeVoice LLC. We provide invoicing, quoting, client management, and payment processing tools for independent contractors and trade businesses, accessible at thetradevoice.com.</p>

        <div style={s.h2}>2. Information We Collect</div>
        <p style={s.p}><strong>Information you provide directly:</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Name, email address, and password when you create an account</li>
          <li style={s.li}>Business name, license number, address, and phone number</li>
          <li style={s.li}>Client names, addresses, and contact information you enter</li>
          <li style={s.li}>Invoice, quote, and payment data you create in the platform</li>
          <li style={s.li}>Payment information processed through our payment partners (Stripe)</li>
        </ul>
        <p style={s.p}><strong>Information collected automatically:</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Device type, browser type, and operating system</li>
          <li style={s.li}>IP address and approximate location</li>
          <li style={s.li}>Pages visited and features used within the platform</li>
          <li style={s.li}>Date and time of activity</li>
        </ul>

        <div style={s.h2}>3. How We Use Your Information</div>
        <p style={s.p}>We use the information we collect to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Provide, operate, and improve the TradeVoice platform</li>
          <li style={s.li}>Process payments and calculate taxes on your behalf</li>
          <li style={s.li}>Send account-related emails (receipts, password resets, billing notices)</li>
          <li style={s.li}>Respond to support requests</li>
          <li style={s.li}>Detect and prevent fraud or unauthorized access</li>
          <li style={s.li}>Comply with legal obligations</li>
        </ul>
        <p style={s.p}>We do <strong>not</strong> sell your personal information to third parties. Ever.</p>

        <div style={s.h2}>4. How We Share Your Information</div>
        <p style={s.p}><strong>With your clients:</strong> Invoice and quote information you send to clients is shared with those clients at your direction.</p>
        <p style={s.p}><strong>With service providers:</strong> We share data with trusted third-party providers including Stripe (payment processing), Supabase (database and authentication), TaxJar (tax calculation), and Vercel (hosting). These providers are contractually required to protect your data.</p>
        <p style={s.p}><strong>For legal reasons:</strong> We may disclose information if required by law, court order, or government request.</p>

        <div style={s.h2}>5. Data Retention</div>
        <p style={s.p}>We retain your account data for as long as your account is active. If you cancel your account, we retain your data for 90 days before permanent deletion, giving you time to export your records.</p>

        <div style={s.h2}>6. Data Security</div>
        <p style={s.p}>We use industry-standard security measures including encrypted connections (HTTPS/TLS), encrypted storage for sensitive data, and row-level security so each user can only access their own data.</p>

        <div style={s.h2}>7. Your Rights</div>
        <p style={s.p}>You have the right to access, correct, delete, or export your personal data at any time. Contact us at privacy@thetradevoice.com to exercise any of these rights.</p>

        <div style={s.h2}>8. Cookies</div>
        <p style={s.p}>We use essential cookies only to keep you logged in and maintain your session. We do not use advertising or tracking cookies.</p>

        <div style={s.h2}>9. Children's Privacy</div>
        <p style={s.p}>TradeVoice is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors.</p>

        <div style={s.h2}>10. Changes to This Policy</div>
        <p style={s.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice in the platform.</p>

        <div style={s.contact}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6a4f', marginBottom: 4 }}>Questions?</div>
          <div style={{ fontSize: 14, color: '#444' }}>Contact us at <strong>privacy@thetradevoice.com</strong> — TradeVoice LLC · thetradevoice.com</div>
        </div>
      </div>
    </div>
  );
}

// ─── TERMS AND CONDITIONS SCREEN ────────────────────────────────────────────
export function TermsScreen({ onBack }) {
  const s = {
    container: { minHeight: '100vh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
    backBtn: { background: 'none', border: 'none', fontSize: 14, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', padding: '4px 0' },
    title: { fontSize: 18, fontWeight: 700, color: '#111' },
    body: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' },
    h1: { fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 4 },
    updated: { fontSize: 13, color: '#999', marginBottom: 32 },
    h2: { fontSize: 16, fontWeight: 700, color: '#111', marginTop: 28, marginBottom: 8 },
    p: { fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 12 },
    li: { fontSize: 15, color: '#444', lineHeight: 1.8, marginBottom: 4 },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16 },
    th: { textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#888', padding: '8px 12px', borderBottom: '1px solid #e0e0e0', textTransform: 'uppercase', letterSpacing: '.06em' },
    td: { fontSize: 14, color: '#444', padding: '10px 12px', borderBottom: '1px solid #f0f0f0' },
    warning: { background: '#fff8f0', border: '1px solid #f5d5a0', borderRadius: 8, padding: '14px 18px', marginTop: 16, fontSize: 14, color: '#7a4f1a', lineHeight: 1.7 },
    contact: { background: '#f0f7f4', border: '1px solid #c8e6d4', borderRadius: 8, padding: '16px 20px', marginTop: 32 },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <span style={s.title}>Terms and Conditions</span>
      </div>
      <div style={s.body}>
        <div style={s.h1}>Terms and Conditions</div>
        <div style={s.updated}>Last updated: April 8, 2026</div>

        <div style={s.h2}>1. Acceptance of Terms</div>
        <p style={s.p}>By creating an account or using the TradeVoice platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these Terms, do not use the Service.</p>

        <div style={s.h2}>2. Description of Service</div>
        <p style={s.p}>TradeVoice is a cloud-based platform that provides contractors and trade businesses with tools for creating invoices and quotes, managing clients, tracking payments, and processing payments through Stripe Connect.</p>

        <div style={s.h2}>3. Account Registration</div>
        <p style={s.p}>To use TradeVoice you must be at least 18 years old, provide accurate registration information, and maintain the security of your account credentials. You are responsible for all activity that occurs under your account.</p>

        <div style={s.h2}>4. Subscription and Billing</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Plan</th>
              <th style={s.th}>Price</th>
              <th style={s.th}>Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={s.td}>Solo</td><td style={s.td}>$49.99/mo</td><td style={s.td}>1 trade</td></tr>
            <tr><td style={s.td}>Pro</td><td style={s.td}>$99.99/mo</td><td style={s.td}>Up to 3 trades</td></tr>
            <tr><td style={s.td}>All Trades</td><td style={s.td}>$149.99/mo</td><td style={s.td}>All 5 trades</td></tr>
            <tr><td style={s.td}>Additional Technician</td><td style={s.td}>$19.99/mo per seat</td><td style={s.td}>Per additional user</td></tr>
          </tbody>
        </table>
        <p style={s.p}>All plans include a <strong>28-day free trial</strong>. No charge until the trial ends. Subscriptions are billed monthly in advance. You may cancel at any time — cancellation takes effect at the end of the current billing period. No refunds for partial months.</p>

        <div style={s.h2}>5. Payment Processing</div>
        <p style={s.p}>TradeVoice uses Stripe Connect for payment processing. By enabling payment collection you agree to Stripe's Terms of Service. TradeVoice charges a <strong>1% platform fee</strong> on payments collected through the platform, in addition to Stripe's standard processing fees (3.9% + $0.30 per transaction).</p>

        <div style={s.h2}>6. Tax Calculations</div>
        <p style={s.p}>TradeVoice provides tax rate estimates as a convenience feature. These estimates may not reflect the exact tax rate applicable to every transaction.</p>
        <div style={s.warning}>
          ⚠️ <strong>TradeVoice is not a tax advisor.</strong> You are solely responsible for collecting and remitting the correct taxes for your business. We strongly recommend consulting a licensed tax professional for your specific tax obligations.
        </div>

        <div style={s.h2}>7. Your Content</div>
        <p style={s.p}>You retain ownership of all data, invoices, quotes, and client information you create in TradeVoice. You grant TradeVoice a limited license to store and process your content solely for the purpose of providing the Service.</p>

        <div style={s.h2}>8. Acceptable Use</div>
        <p style={s.p}>You agree not to use TradeVoice for any illegal or fraudulent purpose, violate any applicable laws, impersonate any person or entity, attempt to gain unauthorized access to the platform, or transmit viruses or malware.</p>

        <div style={s.h2}>9. Contractor Licensing</div>
        <p style={s.p}>TradeVoice displays contractor license codes and information as reference data only. You are solely responsible for maintaining valid licenses and permits required to operate your business in your jurisdiction.</p>

        <div style={s.h2}>10. Disclaimer of Warranties</div>
        <p style={s.p}>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TRADEVOICE DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.</p>

        <div style={s.h2}>11. Limitation of Liability</div>
        <p style={s.p}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEVOICE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO TRADEVOICE IN THE PRECEDING 12 MONTHS.</p>

        <div style={s.h2}>12. Governing Law</div>
        <p style={s.p}>These Terms are governed by the laws of the State of Texas. Any disputes shall be resolved in the courts of Texas.</p>

        <div style={s.h2}>13. Changes to Terms</div>
        <p style={s.p}>We may update these Terms at any time with 14 days advance notice by email or in-platform notification. Continued use after changes constitutes acceptance.</p>

        <div style={s.contact}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6a4f', marginBottom: 4 }}>Questions?</div>
          <div style={{ fontSize: 14, color: '#444' }}>Contact us at <strong>legal@thetradevoice.com</strong> — TradeVoice LLC · thetradevoice.com</div>
        </div>
      </div>
    </div>
  );
}
