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
        <div style={s.updated}>Last updated: May 22, 2026</div>

        <div style={s.h2}>1. Who We Are</div>
        <p style={s.p}>TradeVoice ("we," "us," or "our") is a software product operated by Tiny's Apps LLC. We provide invoicing, quoting, client management, and payment processing tools for independent contractors and trade businesses, accessible at thetradevoice.com. References to "TradeVoice" in this policy describe the product; the legal entity behind the service is Tiny's Apps LLC.</p>

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
          <li style={s.li}>Process payments through our payment partner (Stripe)</li>
          <li style={s.li}>Send account-related emails (receipts, password resets, billing notices)</li>
          <li style={s.li}>Send marketing-related emails on your behalf to your clients, when you explicitly request it (review requests, campaigns) — your clients can opt out at any time via the unsubscribe link in every message</li>
          <li style={s.li}>Process documents you upload (such as rate sheets) using AI to extract structured data</li>
          <li style={s.li}>Respond to support requests</li>
          <li style={s.li}>Detect and prevent fraud or unauthorized access</li>
          <li style={s.li}>Comply with legal obligations</li>
        </ul>
        <p style={s.p}>We do <strong>not</strong> sell your personal information to third parties. Ever.</p>

        <div style={s.h2}>4. How We Share Your Information</div>
        <p style={s.p}><strong>With your clients:</strong> Invoice, quote, and marketing email content you send to clients is shared with those clients at your direction.</p>
        <p style={s.p}><strong>With service providers:</strong> We share data with the following trusted third-party providers, each contractually required to protect your data and use it only to perform the service we contract them for:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Stripe</strong> — payment processing for subscriptions, customer invoices, and Stripe Connect payouts to your bank account</li>
          <li style={s.li}><strong>Supabase</strong> — database, authentication, file storage, and row-level security</li>
          <li style={s.li}><strong>Vercel</strong> — hosting, serverless functions, and edge networking</li>
          <li style={s.li}><strong>Resend</strong> — outbound transactional and marketing email delivery</li>
          <li style={s.li}><strong>Anthropic (Claude)</strong> — AI processing of documents you upload for data extraction (e.g. rate sheets, scope-of-work PDFs) and for AI-assisted scope-of-work synthesis on the Elite plan. See section 5 for details on what data is sent and how it is handled.</li>
          <li style={s.li}><strong>Perplexity AI</strong> — used on the Elite plan to research current building codes and industry standards as part of the AI scope-of-work synthesis feature. Receives the text extracted from your uploaded document but never the original file. See section 5.</li>
          <li style={s.li}><strong>Google</strong> — optional Sign-In with Google. If you use this option, Google shares your name and email address with us. Use of Google services is also governed by Google's own Privacy Policy.</li>
        </ul>
        <p style={s.p}><strong>For legal reasons:</strong> We may disclose information if required by law, court order, or government request.</p>

        <div style={s.h2}>5. AI Document Processing</div>
        <p style={s.p}>TradeVoice includes features that use artificial intelligence to extract structured data from documents you choose to upload, and to assist with drafting scope-of-work language. These features include the Rate Library PDF parser (available on all plans) and the AI Scope Analyzer (available on the Elite plan, which uses both Anthropic and Perplexity in sequence).</p>
        <p style={s.p}><strong>How the AI Scope Analyzer works:</strong> When you drop a scope-of-work PDF into a quote on the Elite plan, the document is temporarily uploaded to our private Supabase storage bucket, then read by Anthropic's Claude API (vision) to extract what's actually in the document. The extracted text — not the original file — is then sent to Perplexity's online-search API to research current building codes, manufacturer specs, and industry standards, returning citations to authoritative sources. Both AI outputs are then synthesized by Claude into a recommended scope-of-work paragraph for your review.</p>
        <p style={s.p}>When you use any AI feature:</p>
        <ul style={s.ul}>
          <li style={s.li}>The document content is sent to Anthropic's Claude API for processing. Per Anthropic's API terms, customer inputs and outputs are <strong>not</strong> used to train Anthropic's models.</li>
          <li style={s.li}>For the AI Scope Analyzer only: the text extracted from your document is also sent to Perplexity AI to research current codes and standards. Per Perplexity's API terms, API customer inputs are not used to train models. Perplexity's responses include citations to publicly indexed sources.</li>
          <li style={s.li}>Uploaded PDFs are stored only as long as needed to complete the analysis and are deleted automatically after the synthesis output is inserted into your quote (or when you discard the analysis). We do not retain a permanent copy of the original document.</li>
          <li style={s.li}>AI output is <strong>advisory only</strong>. It may contain errors, omissions, or inaccurate references to building codes, product specifications, or pricing. You are solely responsible for verifying every line of an AI-generated scope of work against your jurisdiction's actual requirements, your licensing, and the customer's project conditions before sending it to a customer or relying on it for a job. TradeVoice does <strong>not</strong> guarantee code compliance, completeness, or accuracy of any AI-generated content.</li>
          <li style={s.li}>You should not upload documents containing sensitive personal information about third parties (e.g. employees' Social Security numbers, customer financial data) without their consent.</li>
          <li style={s.li}>Using AI features is optional. You can write scope-of-work language entirely by hand and never trigger an AI call.</li>
        </ul>

        <div style={s.h2}>6. Data Retention</div>
        <p style={s.p}>We retain your account data for as long as your account is active. If you cancel your account, we retain your data for 90 days before permanent deletion, giving you time to export your records.</p>

        <div style={s.h2}>7. Data Security</div>
        <p style={s.p}>We use industry-standard security measures including encrypted connections (HTTPS/TLS), encrypted storage for sensitive data, and row-level security so each user can only access their own data.</p>

        <div style={s.h2}>8. Your Rights</div>
        <p style={s.p}>You have the right to access, correct, delete, or export your personal data at any time. Contact us at privacy@thetradevoice.com to exercise any of these rights.</p>

        <div style={s.h2}>9. Cookies</div>
        <p style={s.p}>We use essential cookies only to keep you logged in and maintain your session. We do not use advertising or tracking cookies.</p>

        <div style={s.h2}>10. Children's Privacy</div>
        <p style={s.p}>TradeVoice is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors.</p>

        <div style={s.h2}>11. Changes to This Policy</div>
        <p style={s.p}>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice in the platform.</p>

        <div style={s.contact}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6a4f', marginBottom: 4 }}>Questions?</div>
          <div style={{ fontSize: 14, color: '#444' }}>Contact us at <strong>privacy@thetradevoice.com</strong> — Tiny's Apps LLC · thetradevoice.com</div>
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
        <div style={s.updated}>Last updated: May 22, 2026</div>

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
              <th style={s.th}>Monthly</th>
              <th style={s.th}>Yearly (save 20%)</th>
              <th style={s.th}>Scope</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={s.td}>Solo</td><td style={s.td}>$49.99/mo</td><td style={s.td}>$479.99/yr</td><td style={s.td}>1 trade</td></tr>
            <tr><td style={s.td}>Pro</td><td style={s.td}>$99.99/mo</td><td style={s.td}>$959.99/yr</td><td style={s.td}>Up to 3 trades</td></tr>
            <tr><td style={s.td}>Elite</td><td style={s.td}>$199.99/mo</td><td style={s.td}>$1,919.99/yr</td><td style={s.td}>All 56 trades + 2 tech seats included</td></tr>
            <tr><td style={s.td}>Additional Technician</td><td style={s.td}>$19.99/mo per seat</td><td style={s.td}>—</td><td style={s.td}>Per additional user beyond plan-included seats</td></tr>
          </tbody>
        </table>
        <p style={s.p}>All plans include a <strong>28-day free trial</strong>. A valid payment method is required to start the trial; we do not charge during the trial period. Subscriptions are billed in advance — monthly plans renew every month, yearly plans every year — until you cancel. You may cancel at any time from Settings → Billing; cancellation takes effect at the end of the current billing period and you retain access through that period. <strong>All payments are final and non-refundable.</strong> When the final paid period ends, your account access is locked and your data is retained for 90 days per Section 6 in case you choose to resubscribe. To regain access, you must start a new subscription. Tech seats above any plan-included allowance are billed pro-rata when added; once added, they are non-refundable for the remainder of the current period.</p>

        <div style={s.h2}>5. Payment Processing</div>
        <p style={s.p}>TradeVoice uses Stripe Connect for payment processing. By enabling payment collection you agree to Stripe's Terms of Service. The total processing cost on card and ACH payments collected through TradeVoice is <strong>3.9% + $0.30 per transaction</strong>, which is composed of Stripe's standard rate (2.9% + $0.30) plus TradeVoice's 1% platform fee. By default these fees are added to your client's invoice total so you keep 100% of the amount you invoiced; you can elect to absorb them in the per-invoice settings.</p>

        <div style={s.h2}>6. Tax Calculations</div>
        <p style={s.p}>TradeVoice provides default tax rates by U.S. state and reasonable rules for contractor labor as a convenience feature. These defaults are based on our internal reference tables and are not connected to a live tax-API provider. They may not reflect the exact tax rate applicable to every transaction, local jurisdiction, or service category, and rates may change over time without immediate update in the platform.</p>
        <div style={s.warning}>
          ⚠️ <strong>TradeVoice is not a tax advisor.</strong> You are solely responsible for verifying, collecting, and remitting the correct taxes for your business. We strongly recommend consulting a licensed tax professional for your specific tax obligations and reviewing the per-invoice tax rate against your local requirements before sending an invoice.
        </div>

        <div style={s.h2}>7. Your Content</div>
        <p style={s.p}>You retain ownership of all data, invoices, quotes, and client information you create in TradeVoice. You grant TradeVoice a limited license to store and process your content solely for the purpose of providing the Service.</p>

        <div style={s.h2}>8. Acceptable Use</div>
        <p style={s.p}>You agree not to use TradeVoice for any illegal or fraudulent purpose, violate any applicable laws, impersonate any person or entity, attempt to gain unauthorized access to the platform, or transmit viruses or malware.</p>

        <div style={s.h2}>9. Contractor Licensing</div>
        <p style={s.p}>TradeVoice displays contractor license codes and information as reference data only. You are solely responsible for maintaining valid licenses and permits required to operate your business in your jurisdiction.</p>

        <div style={s.h2}>10. AI-Assisted Features</div>
        <p style={s.p}>TradeVoice offers optional features that use artificial intelligence ("AI Features") to assist with drafting and data entry, including:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Rate Library PDF Parser</strong> — extracts line items from rate sheets you upload.</li>
          <li style={s.li}><strong>AI Scope Analyzer</strong> (Elite plan) — reads a scope-of-work PDF you upload, researches current codes and standards via Anthropic Claude and Perplexity AI, and proposes a synthesized scope-of-work paragraph for your review.</li>
        </ul>
        <div style={s.warning}>
          ⚠️ <strong>AI output is advisory only.</strong> AI-generated content may contain errors, omissions, outdated information, hallucinated code citations, incorrect dimensions, or work items inappropriate for your jurisdiction, your licensing, or the actual job conditions. You must review every AI-generated output before using it in any quote, invoice, customer communication, or work decision. By using any AI Feature, you acknowledge and agree that:
        </div>
        <ul style={s.ul}>
          <li style={s.li}>You will independently verify all AI-generated content against authoritative sources (your local building authority, your licensing board, the manufacturer's documentation, and the actual site conditions) before relying on it.</li>
          <li style={s.li}>TradeVoice, Tiny's Apps LLC, and our AI service providers (Anthropic, Perplexity) make <strong>no warranty</strong> as to the accuracy, completeness, code compliance, or fitness for purpose of any AI-generated content.</li>
          <li style={s.li}>You are <strong>solely responsible</strong> for the content of any quote, invoice, scope of work, or other document you send to a customer, regardless of whether you used AI to draft it.</li>
          <li style={s.li}>TradeVoice is <strong>not liable</strong> for any damages, losses, code violations, permit denials, customer disputes, claims, fines, or other consequences arising from your use of or reliance on AI-generated content, even if the AI output contained errors.</li>
          <li style={s.li}>You will not upload documents to AI Features that contain sensitive personal information about third parties without those parties' consent.</li>
          <li style={s.li}>Citations and references to building codes, manufacturer specifications, or industry standards returned by AI Features point to sources that may have been updated, withdrawn, or misquoted by the AI. You will confirm any such citation directly with the cited source before relying on it.</li>
        </ul>
        <p style={s.p}>Using AI Features is entirely optional. You may write all scope-of-work language, parse rate sheets, and produce all customer-facing content manually without ever invoking an AI Feature.</p>

        <div style={s.h2}>11. Disclaimer of Warranties</div>
        <p style={s.p}>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY. TRADEVOICE DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT ANY AI-GENERATED CONTENT WILL BE ACCURATE OR COMPLETE.</p>

        <div style={s.h2}>12. Limitation of Liability</div>
        <p style={s.p}>TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEVOICE AND TINY'S APPS LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES ARISING FROM YOUR USE OF OR RELIANCE ON AI-GENERATED CONTENT, LOST PROFITS, LOST REVENUE, CODE VIOLATIONS, PERMIT DENIALS, OR CUSTOMER DISPUTES. OUR TOTAL CUMULATIVE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID TO TRADEVOICE IN THE PRECEDING 12 MONTHS.</p>

        <div style={s.h2}>13. Governing Law</div>
        <p style={s.p}>These Terms are governed by the laws of the State of Texas. Any disputes shall be resolved in the courts of Texas.</p>

        <div style={s.h2}>14. Changes to Terms</div>
        <p style={s.p}>We may update these Terms at any time with 14 days advance notice by email or in-platform notification. Continued use after changes constitutes acceptance.</p>

        <div style={s.contact}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2d6a4f', marginBottom: 4 }}>Questions?</div>
          <div style={{ fontSize: 14, color: '#444' }}>Contact us at <strong>legal@thetradevoice.com</strong> — Tiny's Apps LLC · thetradevoice.com</div>
        </div>
      </div>
    </div>
  );
}
