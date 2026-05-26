import React, { useState } from "react";

// ─── PRIVACY POLICY SCREEN ──────────────────────────────────────────────────
//
// This document is a starting baseline drafted by the founder + AI. It will
// be reviewed by counsel before public launch (planned ~June 2026). Sections
// follow the CCPA/CPRA framework so adding California-specific rights and
// other state-law disclosures (VA, CO, CT, UT, TX) is incremental rather
// than a rewrite. Last substantive expansion: 2026-05-22 — added breach
// notification, state-by-state rights, Do-Not-Track stance, international
// transfers, and Anthropic/Perplexity sub-processor disclosures.
export function PrivacyPolicyScreen({ onBack }) {
  const s = {
    container: { minHeight: '100dvh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
    backBtn: { background: 'none', border: 'none', fontSize: 16, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', padding: '4px 0' },
    title: { fontSize: 20, fontWeight: 700, color: '#111' },
    body: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' },
    h1: { fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 4 },
    updated: { fontSize: 15, color: '#999', marginBottom: 32 },
    h2: { fontSize: 18, fontWeight: 700, color: '#111', marginTop: 28, marginBottom: 8 },
    p: { fontSize: 17, color: '#444', lineHeight: 1.8, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 12 },
    li: { fontSize: 17, color: '#444', lineHeight: 1.8, marginBottom: 4 },
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
        <p style={s.p}>TradeVoice ("we," "us," or "our") is a software product operated by Tiny's Apps LLC. We provide invoicing, quoting, client management, scheduling, and payment processing tools for independent contractors and trade businesses, accessible at thetradevoice.com. References to "TradeVoice" in this policy describe the product; the legal entity behind the service is Tiny's Apps LLC.</p>
        <p style={s.p}>This Privacy Policy explains what information we collect from people who use TradeVoice ("Users" — typically contractors or members of their team), what we do with it, and the rights you have over it. A separate set of disclosures applies to the people you (as a contractor) interact with through TradeVoice — your customers, clients, and end-recipients of your invoices and emails. We process those individuals' personal information solely as your service provider (under CCPA terminology) or processor (under similar state laws). You remain the business / controller for that data.</p>

        <div style={s.h2}>2. Information We Collect</div>
        <p style={s.p}><strong>Information you provide directly:</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Identifiers: name, email address, phone number, and password when you create an account</li>
          <li style={s.li}>Business information: company name, license number, business address, trades, states of operation, tax rates, branding (logo, accent color)</li>
          <li style={s.li}>Customer/client records you choose to enter: names, addresses, email addresses, phone numbers, project notes</li>
          <li style={s.li}>Financial information: invoice and quote line items, markups, taxes, payment amounts (payment card numbers are collected and processed by Stripe — we never see them)</li>
          <li style={s.li}>Communications: support tickets and any other messages you send us</li>
        </ul>
        <p style={s.p}><strong>Information collected automatically when you use TradeVoice:</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Device and connection: device type, browser type, operating system, IP address, approximate geographic location derived from IP</li>
          <li style={s.li}>Usage: pages visited, features used, timestamps, error logs (for diagnosing bugs)</li>
          <li style={s.li}>Authentication: session tokens, sign-in timestamps, last-sign-in timestamps (for the founder dashboard and security audit trail)</li>
        </ul>
        <p style={s.p}><strong>Categories of personal information collected under the CCPA / CPRA</strong> (provided here for California residents and as best-practice for users in other states with similar laws):</p>
        <ul style={s.ul}>
          <li style={s.li}><em>Identifiers</em> — name, email, IP address, account ID</li>
          <li style={s.li}><em>Commercial information</em> — invoices, quotes, transaction records you create</li>
          <li style={s.li}><em>Internet or other network activity</em> — pages visited, features used, error logs</li>
          <li style={s.li}><em>Geolocation</em> — approximate location only (city / region from IP, never precise GPS)</li>
          <li style={s.li}><em>Professional or employment information</em> — your trade, license number, business affiliation</li>
          <li style={s.li}><em>Inferences</em> — none beyond billing-status inferences (whether your subscription is active, etc.)</li>
        </ul>
        <p style={s.p}>We do <strong>not</strong> collect: biometric data, precise geolocation, government identifiers (SSN, driver's license — Stripe collects these directly from contractors during Stripe Connect onboarding and does not share them with us), demographic information, or sensitive personal information as defined under the CPRA.</p>

        <div style={s.h2}>3. How We Use Your Information</div>
        <p style={s.p}>We use the information we collect to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Provide, operate, and improve the TradeVoice platform</li>
          <li style={s.li}>Process payments through our payment partner (Stripe)</li>
          <li style={s.li}>Send account-related emails (receipts, password resets, billing notices, security alerts)</li>
          <li style={s.li}>Send marketing-related emails on your behalf to your clients, when you explicitly request it (review requests, campaigns) — your clients can opt out at any time via the unsubscribe link in every message</li>
          <li style={s.li}>Process documents you upload (rate sheets, scope-of-work PDFs) using AI to extract structured data</li>
          <li style={s.li}>Respond to support requests</li>
          <li style={s.li}>Detect and prevent fraud, abuse, or unauthorized access</li>
          <li style={s.li}>Comply with legal obligations and respond to lawful requests from authorities</li>
        </ul>
        <p style={s.p}>We do <strong>not</strong> sell your personal information to third parties. We do <strong>not</strong> share your personal information with third parties for cross-context behavioral advertising. Ever.</p>

        <div style={s.h2}>4. How We Share Your Information</div>
        <p style={s.p}><strong>With your clients (at your direction):</strong> Invoice, quote, and marketing email content you send to clients is shared with those clients when you initiate the send. The "From" line on emails is your business name; your reply-to address is your account email.</p>
        <p style={s.p}><strong>With service providers (sub-processors):</strong> We share data with the following providers, each contractually required to protect your data and use it only to perform the service we engage them for. We maintain a current list here; we update it when sub-processors change. Material additions are disclosed on this page at least 14 days before they take effect.</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Stripe, Inc.</strong> — payment processing for subscriptions, customer invoices, and Stripe Connect payouts to your bank account. Stripe is PCI-DSS Level 1 certified.</li>
          <li style={s.li}><strong>Supabase (Singapore Pte. Ltd.)</strong> — managed Postgres database, authentication, file storage, row-level security.</li>
          <li style={s.li}><strong>Vercel, Inc.</strong> — hosting, serverless functions, edge networking, deployment pipeline.</li>
          <li style={s.li}><strong>Resend, Inc.</strong> — outbound transactional and marketing email delivery.</li>
          <li style={s.li}><strong>Anthropic, PBC (Claude)</strong> — AI processing of documents you upload for data extraction and scope-of-work synthesis. See section 5.</li>
          <li style={s.li}><strong>Perplexity AI, Inc.</strong> — used on the Elite plan to research current building codes and industry standards. Receives extracted text from your document but never the original file. See section 5.</li>
          <li style={s.li}><strong>Google LLC</strong> — optional Sign-In with Google. If you use this option, Google shares your name and email address with us. Use of Google services is also governed by Google's own Privacy Policy.</li>
        </ul>
        <p style={s.p}><strong>For legal reasons:</strong> We may disclose information if required by law, valid court order, subpoena, government request, or to enforce these terms or protect our rights, property, or safety, or that of our users or the public. If lawful and possible, we will notify the affected User before disclosure.</p>
        <p style={s.p}><strong>In a business transfer:</strong> If TradeVoice or Tiny's Apps LLC is acquired, merged, or restructured, your information may transfer to the new owner subject to the same protections as in this Policy. We will notify you of any such change.</p>

        <div style={s.h2}>5. AI Document Processing</div>
        <p style={s.p}>TradeVoice includes features that use artificial intelligence to extract structured data from documents you choose to upload, and to assist with drafting scope-of-work language. These features include the Rate Library PDF parser (available on all plans) and the AI Scope Analyzer (available on the Elite plan, which uses both Anthropic and Perplexity in sequence).</p>
        <p style={s.p}><strong>How the AI Scope Analyzer works:</strong> When you drop a scope-of-work PDF into a quote on the Elite plan, the document is temporarily uploaded to our private Supabase storage bucket, then read by Anthropic's Claude API (vision) to extract what's actually in the document. The extracted text — not the original file — is then sent to Perplexity's online-search API to research current building codes, manufacturer specs, and industry standards, returning citations to authoritative sources. Both AI outputs are then synthesized by Claude into a recommended scope-of-work paragraph for your review.</p>
        <p style={s.p}>When you use any AI feature:</p>
        <ul style={s.ul}>
          <li style={s.li}>The document content is sent to Anthropic's Claude API for processing. Per Anthropic's commercial API terms, customer inputs and outputs are <strong>not</strong> used to train Anthropic's models.</li>
          <li style={s.li}>For the AI Scope Analyzer only: the text extracted from your document is also sent to Perplexity AI to research current codes and standards. Per Perplexity's commercial API terms, API customer inputs are not used to train models. Perplexity's responses include citations to publicly indexed sources.</li>
          <li style={s.li}>Uploaded PDFs are stored only as long as needed to complete the analysis and are deleted automatically after the synthesis output is inserted into your quote (or when you discard the analysis). We do not retain a permanent copy of the original document.</li>
          <li style={s.li}>AI output is <strong>advisory only</strong>. It may contain errors, omissions, or inaccurate references to building codes, product specifications, or pricing. You are solely responsible for verifying every line of an AI-generated scope of work against your jurisdiction's actual requirements, your licensing, and the customer's project conditions before sending it to a customer or relying on it for a job. TradeVoice does <strong>not</strong> guarantee code compliance, completeness, or accuracy of any AI-generated content.</li>
          <li style={s.li}>You should not upload documents containing sensitive personal information about third parties (e.g. employees' Social Security numbers, customer financial data) without their consent.</li>
          <li style={s.li}>Using AI features is optional. You can write scope-of-work language entirely by hand and never trigger an AI call.</li>
        </ul>

        <div style={s.h2}>6. Data Retention</div>
        <p style={s.p}>We retain your data as follows:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Account profile + business data:</strong> for as long as your account is active.</li>
          <li style={s.li}><strong>After account cancellation or closure:</strong> 90 days, then permanent deletion, unless we are required by law (e.g. tax records, fraud investigation) or by contract to retain longer.</li>
          <li style={s.li}><strong>Invoice + payment records:</strong> retained for at least 7 years from creation to support contractor tax recordkeeping and dispute resolution, even after account closure.</li>
          <li style={s.li}><strong>Uploaded AI PDFs (scope documents, rate sheets):</strong> deleted immediately after analysis completes.</li>
          <li style={s.li}><strong>Server logs (access logs, error logs):</strong> 30-90 days depending on log type.</li>
          <li style={s.li}><strong>Marketing email send records:</strong> 24 months for compliance auditing and dispute investigation.</li>
        </ul>
        <p style={s.p}>You may export your records at any time through the in-app export tools (CSV / PDF). For full account export beyond what the UI provides, email privacy@thetradevoice.com.</p>

        <div style={s.h2}>7. Data Security</div>
        <p style={s.p}>We use commercially reasonable security measures appropriate to the nature of the data we hold, including:</p>
        <ul style={s.ul}>
          <li style={s.li}>Encryption in transit (TLS 1.2+) for all data flowing between your browser, our servers, and our sub-processors.</li>
          <li style={s.li}>Encryption at rest (AES-256) for all stored data, including database contents and uploaded files, as provided by our infrastructure providers.</li>
          <li style={s.li}>Row-level security (RLS) policies at the database layer so each contractor account can only access its own data — even if a server-side bug attempted to query across accounts, the database itself enforces the boundary.</li>
          <li style={s.li}>Two-factor authentication (TOTP) on all administrative accounts.</li>
          <li style={s.li}>Service-provider authentication via signed JWTs; service-role credentials never exposed to the browser.</li>
          <li style={s.li}>Annual third-party security review (planned post-launch as we engage SOC-2 readiness counsel).</li>
        </ul>
        <p style={s.p}>No system is 100% secure. While we work hard to protect your data, we cannot guarantee the absolute security of information transmitted to or stored on our platform.</p>

        <div style={s.h2}>8. Breach Notification</div>
        <p style={s.p}>If we become aware of a security breach that affects your personal information, we will:</p>
        <ul style={s.ul}>
          <li style={s.li}>Investigate the scope and cause within a reasonable time, typically 72 hours of discovery.</li>
          <li style={s.li}>Notify affected users without unreasonable delay, in any case within the timeframes required by applicable state and federal law (e.g. California Civil Code § 1798.82; Texas Business & Commerce Code § 521.053; equivalent provisions in other states).</li>
          <li style={s.li}>Provide a description of what happened, what information was affected, what we have done to address it, and what steps you can take to protect yourself.</li>
          <li style={s.li}>Notify state attorneys general where required by law.</li>
        </ul>

        <div style={s.h2}>9. Your Privacy Rights</div>
        <p style={s.p}>Regardless of where you live, you generally have the right to:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Access</strong> a copy of the personal information we hold about you.</li>
          <li style={s.li}><strong>Correct</strong> any inaccurate personal information.</li>
          <li style={s.li}><strong>Delete</strong> your personal information, subject to lawful retention obligations.</li>
          <li style={s.li}><strong>Export</strong> your personal information in a portable format (CSV / JSON).</li>
          <li style={s.li}><strong>Opt out</strong> of any non-essential communications.</li>
          <li style={s.li}><strong>Object</strong> to certain processing or withdraw any consent you previously gave.</li>
          <li style={s.li}><strong>Not be discriminated against</strong> for exercising any of these rights.</li>
        </ul>
        <p style={s.p}>To exercise any of these rights, email <strong>privacy@thetradevoice.com</strong>. We will respond within 45 days (extendable to 90 days for complex requests, with notice to you). We may need to verify your identity before processing a request.</p>
        <p style={s.p}><strong>California residents (CCPA / CPRA):</strong> California law gives you the additional right to know the categories of personal information we have collected, the sources, the business purpose for collection, and the categories of third parties with whom we share it (all disclosed in sections 2-4 above). You also have the right to opt out of any "sale" or "sharing" of personal information for cross-context behavioral advertising — TradeVoice does not engage in either, but you have the right regardless. You may designate an authorized agent to make requests on your behalf with written authorization.</p>
        <p style={s.p}><strong>Residents of Virginia, Colorado, Connecticut, Utah, Texas, and other states with consumer-privacy laws:</strong> You have rights substantively similar to the California rights above. The same email address and process apply. You may also have a right to appeal a denial of a request — to appeal, reply to our response email with "Appeal" in the subject line.</p>
        <p style={s.p}><strong>Residents of the European Union, United Kingdom, or other jurisdictions covered by the GDPR or equivalent:</strong> You have rights under those laws including the rights described above plus the right to restrict processing and the right to lodge a complaint with a supervisory authority. The legal basis for our processing is either (a) performance of the contract between you and TradeVoice, (b) our legitimate interests in operating and improving the service, or (c) your explicit consent for certain features (such as AI document analysis). At this time TradeVoice is principally offered to U.S. contractors; international use is at your own risk and you are responsible for compliance with your local laws.</p>

        <div style={s.h2}>10. Cookies & Tracking</div>
        <p style={s.p}>We use only the cookies and similar storage technologies necessary to operate the service:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Authentication tokens</strong> — to keep you signed in across page reloads, stored by your browser via the Supabase JavaScript SDK.</li>
          <li style={s.li}><strong>Session state</strong> — to remember your current navigation context (which screen you're on, your sort preferences).</li>
        </ul>
        <p style={s.p}>We do <strong>not</strong> use advertising cookies, behavioral-tracking pixels, third-party analytics that share data with advertisers, or session-replay services. No part of the TradeVoice product is funded by advertising.</p>

        <div style={s.h2}>11. Do Not Track</div>
        <p style={s.p}>Some browsers send a "Do Not Track" (DNT) signal. Because there is no universally accepted standard for what DNT means and we don't track for advertising purposes regardless, we do not currently change our behavior based on the DNT signal. This statement is provided so you know our position.</p>

        <div style={s.h2}>12. International Users / Data Transfers</div>
        <p style={s.p}>TradeVoice is operated from the United States and our infrastructure providers' data centers are primarily located in the United States. If you access the service from outside the U.S., your information will be transferred to, stored in, and processed in the United States, where data-protection laws may differ from those in your country. By using TradeVoice you consent to this transfer.</p>

        <div style={s.h2}>13. Children's Privacy</div>
        <p style={s.p}>TradeVoice is not intended for, designed for, or directed to children under the age of 18. We do not knowingly collect personal information from anyone under 18. If we learn we have collected personal information from a minor, we will delete it. If you believe we have inadvertently collected information from a child, please contact privacy@thetradevoice.com.</p>

        <div style={s.h2}>14. Changes to This Policy</div>
        <p style={s.p}>We may update this Privacy Policy from time to time. For material changes that affect your rights, we will notify you by email or by a prominent notice in the platform at least 14 days before the change takes effect. The "Last updated" date at the top of this policy reflects the date of the most recent revision.</p>

        <div style={s.contact}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d6a4f', marginBottom: 8 }}>How to reach us</div>
          <div style={{ fontSize: 15, color: '#444', lineHeight: 1.8 }}>
            <div><strong>privacy@thetradevoice.com</strong> — privacy-rights requests, data exports, deletion under CCPA / state laws (primary contact for anything in this policy)</div>
            <div><strong>support@thetradevoice.com</strong> — general product questions or account help</div>
            <div><strong>legal@thetradevoice.com</strong> — formal legal notices, DMCA, disputes</div>
            <div><strong>security@thetradevoice.com</strong> — vulnerability reports, coordinated security disclosures</div>
            <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>Tiny's Apps LLC · thetradevoice.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TERMS AND CONDITIONS SCREEN ────────────────────────────────────────────
//
// Defensive baseline drafted by the founder + AI. To be reviewed by counsel
// before public launch (~June 2026). Structure follows standard SaaS Terms
// patterns: definitions → service scope → billing → user obligations →
// platform disclaimers → liability → dispute resolution → boilerplate.
//
// Recent additions (2026-05-22): payment-processing bug carve-out, customer-
// data warranties, anti-spam compliance, force majeure, indemnification,
// no-professional-advice, DMCA, arbitration + class-action waiver, beta
// features disclaimer.
export function TermsScreen({ onBack }) {
  const s = {
    container: { minHeight: '100dvh', background: '#f7f7f5', fontFamily: "'Inter', sans-serif" },
    header: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
    backBtn: { background: 'none', border: 'none', fontSize: 16, color: '#2d6a4f', fontWeight: 600, cursor: 'pointer', padding: '4px 0' },
    title: { fontSize: 20, fontWeight: 700, color: '#111' },
    body: { maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' },
    h1: { fontSize: 28, fontWeight: 800, color: '#111', marginBottom: 4 },
    updated: { fontSize: 15, color: '#999', marginBottom: 32 },
    h2: { fontSize: 18, fontWeight: 700, color: '#111', marginTop: 28, marginBottom: 8 },
    p: { fontSize: 17, color: '#444', lineHeight: 1.8, marginBottom: 12 },
    ul: { paddingLeft: 20, marginBottom: 12 },
    li: { fontSize: 17, color: '#444', lineHeight: 1.8, marginBottom: 4 },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16 },
    th: { textAlign: 'left', fontSize: 15, fontWeight: 700, color: '#888', padding: '8px 12px', borderBottom: '1px solid #e0e0e0', textTransform: 'uppercase', letterSpacing: '.06em' },
    td: { fontSize: 16, color: '#444', padding: '10px 12px', borderBottom: '1px solid #f0f0f0' },
    warning: { background: '#fff8f0', border: '1px solid #f5d5a0', borderRadius: 8, padding: '14px 18px', marginTop: 16, fontSize: 16, color: '#7a4f1a', lineHeight: 1.7 },
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
        <p style={s.p}>By creating an account on or using the TradeVoice platform (the "Service"), you agree to be bound by these Terms and Conditions (the "Terms") and our Privacy Policy. If you do not agree, do not create an account and do not use the Service.</p>
        <p style={s.p}>If you are accepting these Terms on behalf of a business entity (LLC, corporation, partnership, sole proprietorship), you represent and warrant that you have the authority to bind that entity. "You" and "your" in these Terms refer both to the individual using the Service and to the business entity, if any, on whose behalf the Service is used.</p>

        <div style={s.h2}>2. Definitions</div>
        <ul style={s.ul}>
          <li style={s.li}><strong>"TradeVoice", "we", "us", "our"</strong> — Tiny's Apps LLC, doing business as TradeVoice. References to TradeVoice describe the product; the legal counterparty is Tiny's Apps LLC.</li>
          <li style={s.li}><strong>"Service"</strong> — the TradeVoice web application, mobile-responsive interfaces, API endpoints, supporting documentation, and any related services we provide.</li>
          <li style={s.li}><strong>"User"</strong> — any individual who accesses or uses the Service, including account owners, technicians (team members), and authorized agents.</li>
          <li style={s.li}><strong>"Account"</strong> — your individual or business account on the Service, including all User identities (techs) that you authorize to use it.</li>
          <li style={s.li}><strong>"Customer", "Client"</strong> — a third party with whom you (the User) do business, and whose information you enter or store in the Service. We do not have a direct relationship with your Customers and are not a party to your contracts with them.</li>
          <li style={s.li}><strong>"Content"</strong> — any data you upload, enter, or generate using the Service: invoices, quotes, scopes of work, client records, photos, rate library items, and similar.</li>
          <li style={s.li}><strong>"AI Features"</strong> — the Service features that use third-party artificial intelligence (Anthropic Claude, Perplexity AI) to analyze documents or draft text on your request.</li>
          <li style={s.li}><strong>"Stripe Connect"</strong> — the payment infrastructure provided by Stripe, Inc. through which TradeVoice helps you accept payments from your Customers.</li>
        </ul>

        <div style={s.h2}>3. Description of Service</div>
        <p style={s.p}>TradeVoice is a cloud-based platform that provides contractors and trade businesses with tools for creating invoices and quotes, managing clients, scheduling jobs, tracking payments, and processing payments through Stripe Connect. Specific features may be added, removed, or modified over time at our discretion. We will provide reasonable advance notice for material changes to existing features.</p>

        <div style={s.h2}>4. Account Registration & Eligibility</div>
        <p style={s.p}>To use TradeVoice you must:</p>
        <ul style={s.ul}>
          <li style={s.li}>Be at least 18 years old.</li>
          <li style={s.li}>Have the legal capacity to enter into binding agreements in your jurisdiction.</li>
          <li style={s.li}>Provide accurate, current, and complete registration information.</li>
          <li style={s.li}>Maintain the security of your account credentials and notify us immediately of any unauthorized access.</li>
          <li style={s.li}>Be responsible for all activity that occurs under your Account, including activity by any technician seat you authorize.</li>
          <li style={s.li}>Not allow any other person or entity to use your credentials.</li>
        </ul>
        <p style={s.p}>We reserve the right to refuse service, suspend accounts, or terminate accounts at our sole discretion, with or without notice, for any User that violates these Terms or that we believe in good faith poses a risk to the Service, our other Users, or any third party.</p>

        <div style={s.h2}>5. Subscription and Billing</div>
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
            <tr><td style={s.td}>Pro</td><td style={s.td}>$99.99/mo</td><td style={s.td}>$959.99/yr</td><td style={s.td}>Up to 3 trades + 1 tech seat</td></tr>
            <tr><td style={s.td}>Elite</td><td style={s.td}>$199.99/mo</td><td style={s.td}>$1,919.99/yr</td><td style={s.td}>All 56+ trades + 2 tech seats included</td></tr>
            <tr><td style={s.td}>Additional Technician</td><td style={s.td}>$19.99/mo per seat</td><td style={s.td}>—</td><td style={s.td}>Per additional user beyond plan-included seats</td></tr>
          </tbody>
        </table>
        <p style={s.p}>All plans include a <strong>28-day free trial</strong>. A valid payment method is required to start the trial; we do not charge during the trial period.</p>
        <p style={s.p}><strong>Auto-renewal disclosure:</strong> Subscriptions automatically renew at the end of each billing period (monthly or yearly) until you cancel. Monthly subscriptions renew every month; yearly subscriptions renew every year. You authorize us to charge your saved payment method for each renewal. You may cancel at any time from Settings → Billing. Cancellation takes effect at the end of the current billing period and you retain access through that period.</p>
        <p style={s.p}><strong>All payments are final and non-refundable.</strong> When the final paid period ends, your account access is locked and your Content is retained per the Privacy Policy retention schedule in case you choose to resubscribe. To regain access, you must start a new subscription. Tech seats added above any plan-included allowance are billed pro-rata when added; they are non-refundable for the remainder of the current period.</p>
        <p style={s.p}>We reserve the right to change pricing at any time. Price changes for existing subscriptions take effect at the next billing cycle following at least 30 days written notice to you.</p>
        <p style={s.p}><strong>Billing questions, invoice disputes, or payment-method changes:</strong> email <strong>billing@thetradevoice.com</strong>. For account-cancellation requests where the in-app Settings → Billing flow isn't working, billing@ is also the right address.</p>

        <div style={s.h2}>6. Payment Processing</div>
        <p style={s.p}>TradeVoice uses Stripe Connect to process payments from your Customers and to handle your subscription billing with us. By enabling payment collection you agree to be bound by Stripe's Connected Account Agreement and Services Agreement, which are incorporated by reference. You acknowledge that the relationship for Customer payments is between you, your Customer, and Stripe — TradeVoice is not a party to that payment relationship.</p>
        <p style={s.p}>The total processing cost on card and ACH payments collected through TradeVoice is <strong>2.9% + $0.30 per transaction (Stripe) plus a 1% TradeVoice platform fee</strong>. By default these fees are added to your Customer's invoice total so you keep 100% of the amount you invoiced. You can elect to absorb the fees in the per-invoice settings.</p>
        <div style={s.warning}>
          ⚠️ <strong>Payment amount responsibility.</strong> You are solely responsible for the accuracy of every invoice, quote, and payment request you send to your Customers. While we provide calculation tools (line items, markups, tax, totals), you must verify the final amount on every document before sending. If a calculation error in the Service (a bug, an incorrect tax rate, an AI extraction error, etc.) results in you charging a Customer an incorrect amount, your remedy is to reissue a corrected invoice; TradeVoice is not liable for the difference, for any refund you may owe your Customer, or for any downstream consequence. This applies regardless of the cause of the error.
        </div>

        <div style={s.h2}>7. Tax Calculations</div>
        <p style={s.p}>TradeVoice provides default tax rates by U.S. state and reasonable rules for contractor labor as a convenience feature. These defaults are based on our internal reference tables and are not connected to a live tax-API provider. They may not reflect the exact tax rate applicable to every transaction, local jurisdiction, or service category, and rates may change over time without immediate update in the platform.</p>
        <div style={s.warning}>
          ⚠️ <strong>TradeVoice is not a tax advisor.</strong> You are solely responsible for verifying, collecting, and remitting the correct taxes for your business. We strongly recommend consulting a licensed tax professional for your specific tax obligations and reviewing the per-invoice tax rate against your local requirements before sending an invoice.
        </div>

        <div style={s.h2}>8. Your Content and Customer Data</div>
        <p style={s.p}>You retain ownership of all Content you create, upload, or store in TradeVoice. You grant TradeVoice a limited, non-exclusive, worldwide, royalty-free license to host, store, copy, transmit, display, modify (for technical purposes such as formatting and storage), and process your Content solely for the purpose of providing the Service to you.</p>
        <p style={s.p}><strong>Customer data warranties.</strong> Your Customers' information that you enter into TradeVoice (names, addresses, emails, phone numbers, payment information collected via Stripe, project details) belongs to those Customers, not to you, and is subject to your relationship with them. By entering or uploading such information, you represent and warrant that:</p>
        <ul style={s.ul}>
          <li style={s.li}>You have the legal right and any required consent to enter, store, and process the information using TradeVoice.</li>
          <li style={s.li}>Your collection and use of the information complies with all applicable laws, including state and federal privacy laws (such as the California Consumer Privacy Act, Virginia Consumer Data Protection Act, and similar state laws).</li>
          <li style={s.li}>You have provided your Customers with any privacy notice required by law disclosing how their information will be used, including the use of a third-party platform (TradeVoice) and its sub-processors.</li>
          <li style={s.li}>You will honor any privacy-rights requests your Customers make (access, deletion, correction) in a timely manner, including by using the export and delete features TradeVoice provides.</li>
        </ul>
        <p style={s.p}>You agree to indemnify and hold us harmless from any claim by a Customer, regulator, or third party arising from your failure to comply with these warranties (see Section 17).</p>

        <div style={s.h2}>9. Acceptable Use & Anti-Spam Compliance</div>
        <p style={s.p}>You agree not to use TradeVoice to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Violate any applicable law, regulation, or third-party right.</li>
          <li style={s.li}>Send unsolicited commercial emails (spam) in violation of the CAN-SPAM Act of 2003, the Telephone Consumer Protection Act (TCPA), or equivalent laws in your jurisdiction. By using the Marketing features (review requests, campaigns) you represent that every recipient on your list has expressly opted in to receive commercial email from your business OR has an established business relationship with you that legally permits the communication.</li>
          <li style={s.li}>Send harassing, abusive, defamatory, obscene, or otherwise unlawful communications to any Customer through the Service.</li>
          <li style={s.li}>Misrepresent your identity, your business, your licensing, or your products and services to a Customer through the Service.</li>
          <li style={s.li}>Use the Service to perpetrate fraud, including by issuing invoices for work not performed, falsifying payment receipts, or laundering funds through the Stripe payment flow.</li>
          <li style={s.li}>Attempt to gain unauthorized access to other Users' accounts, our servers, or the underlying systems we use.</li>
          <li style={s.li}>Reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code of the Service, except to the extent expressly permitted by applicable law.</li>
          <li style={s.li}>Scrape, harvest, or extract data from the Service in bulk, by automated means, or in a manner that imposes an unreasonable load on our infrastructure.</li>
          <li style={s.li}>Resell, sublicense, or commercially redistribute the Service or any output of the Service to third parties as a standalone offering.</li>
          <li style={s.li}>Transmit any virus, malware, worm, trojan horse, or other malicious code through the Service.</li>
        </ul>
        <p style={s.p}>Violation of any provision in this section is grounds for immediate suspension or termination of your account without refund and may subject you to civil or criminal liability.</p>

        <div style={s.h2}>10. Contractor Licensing</div>
        <p style={s.p}>TradeVoice displays contractor license codes and information as reference data only. You are solely responsible for maintaining valid licenses, registrations, bonds, insurance, and permits required to operate your business in your jurisdiction and for any specific project. The presence of a license-number field, a state-licensing-board reference, or a per-state license entry in the Service is not a representation by us that you are properly licensed, that the license shown is current, or that the work scoped on your invoice is within the scope of that license. Verify your own credentials directly with your licensing board.</p>

        <div style={s.h2}>11. AI-Assisted Features</div>
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
          <li style={s.li}>You are <strong>solely responsible</strong> for the content of any quote, invoice, scope of work, or other document you send to a Customer, regardless of whether you used AI to draft it.</li>
          <li style={s.li}>TradeVoice is <strong>not liable</strong> for any damages, losses, code violations, permit denials, customer disputes, claims, fines, or other consequences arising from your use of or reliance on AI-generated content, even if the AI output contained errors.</li>
          <li style={s.li}>You will not upload documents to AI Features that contain sensitive personal information about third parties without those parties' consent.</li>
          <li style={s.li}>Citations and references to building codes, manufacturer specifications, or industry standards returned by AI Features point to sources that may have been updated, withdrawn, or misquoted by the AI. You will confirm any such citation directly with the cited source before relying on it.</li>
        </ul>
        <p style={s.p}>Using AI Features is entirely optional. You may write all scope-of-work language, parse rate sheets, and produce all customer-facing content manually without ever invoking an AI Feature.</p>

        <div style={s.h2}>12. Beta Features</div>
        <p style={s.p}>From time to time we may identify certain features as "Beta", "Preview", "Coming Soon", or similar. Beta features are provided as a courtesy and may be unstable, incomplete, or changed materially or discontinued at any time without notice. Beta features are excluded from any service-level commitments and the warranty and liability disclaimers in these Terms apply with full force to Beta features. Your use of a Beta feature is entirely at your own risk.</p>

        <div style={s.h2}>13. Service Availability & Force Majeure</div>
        <p style={s.p}>We strive to keep TradeVoice available 24/7, but we do not guarantee uninterrupted operation. The Service may be unavailable from time to time due to planned maintenance, third-party outages (Supabase, Vercel, Stripe, Resend, Anthropic, Perplexity), denial-of-service attacks, or other events outside our reasonable control.</p>
        <p style={s.p}>Neither party will be liable for any failure or delay in performance caused by acts of God, natural disasters, war, terrorism, civil unrest, government action, pandemic, internet or telecommunications failures, failures of cloud-infrastructure providers, or other events outside its reasonable control ("Force Majeure Events"). The affected party will use commercially reasonable efforts to mitigate the impact and resume performance.</p>
        <p style={s.p}>TradeVoice does not currently provide a contractual service-level agreement (SLA). Such commitments may be offered in future plans, in which case they will be set forth in a separate addendum.</p>

        <div style={s.h2}>14. Termination</div>
        <p style={s.p}><strong>By you:</strong> You may terminate your account at any time from Settings → Billing, by emailing <strong>billing@thetradevoice.com</strong> (for routine cancellations), or by emailing <strong>legal@thetradevoice.com</strong> (for dispute-related terminations or when you need a formal records-retention confirmation). Termination takes effect at the end of your current billing period.</p>
        <p style={s.p}><strong>By us:</strong> We may suspend or terminate your account, with or without prior notice, if:</p>
        <ul style={s.ul}>
          <li style={s.li}>You fail to pay subscription fees by the due date.</li>
          <li style={s.li}>You materially breach any provision of these Terms, including the Acceptable Use restrictions in Section 9.</li>
          <li style={s.li}>You use the Service in a way that exposes us to liability, regulatory action, or reputational harm.</li>
          <li style={s.li}>You fail to maintain a valid Stripe Connect account in good standing, where the Stripe relationship is required for the Service's payment features.</li>
          <li style={s.li}>We are required to do so by law, court order, or government request.</li>
          <li style={s.li}>We discontinue the Service or a feature you depend on, in which case we will provide at least 60 days written notice and a pro-rata refund of any prepaid yearly amounts covering the period after discontinuation.</li>
        </ul>
        <p style={s.p}>Upon termination by either party, your access to the Service ends and your data is retained per the Privacy Policy retention schedule (90 days from termination, then permanent deletion, subject to legal-retention requirements). You may export your data through the in-app tools at any time before the 90-day window closes.</p>

        <div style={s.h2}>15. Disclaimer of Warranties</div>
        <p style={s.p}>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, TRADEVOICE AND TINY'S APPS LLC DISCLAIM ALL WARRANTIES, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR ARISING FROM COURSE OF DEALING OR USAGE OF TRADE.</p>
        <p style={s.p}>TRADEVOICE DOES NOT WARRANT THAT: (a) THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE; (b) DEFECTS WILL BE CORRECTED; (c) ANY DATA, CALCULATIONS, TAX RATES, LICENSE CODES, AI-GENERATED CONTENT, OR OTHER MATERIAL PROVIDED THROUGH THE SERVICE WILL BE ACCURATE OR COMPLETE; OR (d) THE SERVICE WILL MEET YOUR SPECIFIC REQUIREMENTS.</p>

        <div style={s.h2}>16. Limitation of Liability</div>
        <p style={s.p}>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL TRADEVOICE OR TINY'S APPS LLC, OR ANY OF OUR OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, OR SERVICE PROVIDERS, BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOST PROFITS, LOST REVENUE, LOST DATA, BUSINESS INTERRUPTION, CODE VIOLATIONS, PERMIT DENIALS, CUSTOMER DISPUTES, REGULATORY FINES, OR CLAIMS BY YOUR CUSTOMERS OR ANY THIRD PARTY, ARISING OUT OF OR RELATING TO YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
        <p style={s.p}>OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ALL CLAIMS UNDER OR RELATED TO THESE TERMS OR THE SERVICE, WHETHER IN CONTRACT, TORT, OR OTHERWISE, WILL NOT EXCEED THE GREATER OF (a) THE AMOUNT YOU PAID TO TRADEVOICE IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (b) ONE HUNDRED U.S. DOLLARS ($100).</p>
        <p style={s.p}>Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for incidental or consequential damages, so the above limitations may not apply to you in full. In such jurisdictions, our liability is limited to the maximum extent permitted by law.</p>

        <div style={s.h2}>17. Indemnification</div>
        <p style={s.p}>You agree to defend, indemnify, and hold harmless TradeVoice, Tiny's Apps LLC, and our officers, directors, employees, agents, affiliates, and service providers from and against any and all claims, demands, suits, proceedings, damages, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Your Content or your use of the Service.</li>
          <li style={s.li}>Your violation of these Terms or applicable law.</li>
          <li style={s.li}>Your violation of any third-party right, including any privacy, publicity, intellectual-property, or contractual right of any Customer or other third party.</li>
          <li style={s.li}>Disputes between you and your Customers regarding the quality, completeness, pricing, scope, or legality of your work.</li>
          <li style={s.li}>Any AI-generated content you used in a customer-facing document.</li>
          <li style={s.li}>Any tax calculation, license reference, or compliance representation made on a document you sent through the Service.</li>
        </ul>
        <p style={s.p}>We reserve the right, at our own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, in which case you agree to cooperate with our defense.</p>

        <div style={s.h2}>18. No Professional Advice</div>
        <p style={s.p}>TradeVoice is a software tool. Nothing provided through the Service constitutes legal advice, tax advice, accounting advice, licensing advice, engineering advice, code-compliance advice, business advice, or any other form of professional advice. References to building codes, tax rates, license requirements, and similar are provided as a convenience and are not a substitute for advice from a qualified professional in the relevant field. Always consult a licensed attorney, certified public accountant, licensed contractor advisor, building official, or other qualified professional regarding your specific situation.</p>

        <div style={s.h2}>19. Intellectual Property & DMCA</div>
        <p style={s.p}>The Service, including all software, user interface, designs, text, graphics, logos, trademarks, and underlying technology, is owned by Tiny's Apps LLC or its licensors and is protected by copyright, trademark, and other intellectual-property laws. Except for the limited rights granted to you to use the Service, no other rights are granted by implication, estoppel, or otherwise.</p>
        <p style={s.p}>The "TradeVoice" name and logo are trademarks of Tiny's Apps LLC. You may not use them without our prior written consent except to refer to the Service as you use it (e.g. "Sent via TradeVoice" in an email footer).</p>
        <p style={s.p}><strong>DMCA notices:</strong> If you believe content on the Service infringes your copyright, send a written notice including the items required under 17 U.S.C. § 512(c)(3) to <strong>legal@thetradevoice.com</strong>. We will respond as required by the Digital Millennium Copyright Act.</p>

        <div style={s.h2}>20. Dispute Resolution & Arbitration</div>
        <p style={s.p}><strong>Informal resolution.</strong> Before filing a claim, you agree to try to resolve the dispute informally by contacting <strong>legal@thetradevoice.com</strong>. We will try to resolve the dispute by negotiating in good faith.</p>
        <p style={s.p}><strong>Binding arbitration.</strong> If we cannot resolve a dispute informally within 60 days, any dispute, claim, or controversy arising out of or relating to these Terms or the Service ("Dispute") will be resolved by binding individual arbitration administered by JAMS under its Streamlined Arbitration Rules and Procedures, except as provided below. The arbitration will be conducted in English, in or near the state of Texas, or via video conference at the option of the consumer party. The arbitrator's decision will be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
        <p style={s.p}><strong>Class-action waiver.</strong> YOU AND TRADEVOICE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING. The arbitrator may not consolidate more than one person's claims and may not preside over any form of representative proceeding.</p>
        <p style={s.p}><strong>Exceptions.</strong> Notwithstanding the above, either party may bring an action in small-claims court if the dispute qualifies, and either party may seek injunctive or other equitable relief in any court of competent jurisdiction for any actual or threatened infringement, misappropriation, or violation of intellectual-property or confidentiality rights.</p>
        <p style={s.p}><strong>Opt-out.</strong> You may opt out of the arbitration agreement and class-action waiver by sending a written notice to <strong>legal@thetradevoice.com</strong> within 30 days of first accepting these Terms. The notice must include your name, account email, and a clear statement that you wish to opt out. Opting out will not affect any other provision of these Terms.</p>

        <div style={s.h2}>21. Governing Law</div>
        <p style={s.p}>These Terms are governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict-of-laws principles. Subject to Section 20 (Arbitration), any judicial action permitted by these Terms must be brought in the state or federal courts located in Harris County, Texas, and the parties consent to the exclusive personal jurisdiction and venue of those courts.</p>

        <div style={s.h2}>22. Changes to Terms</div>
        <p style={s.p}>We may update these Terms at any time. For material changes that affect your rights or obligations, we will provide at least 14 days advance notice by email to your account email address and / or by an in-platform notification. Continued use of the Service after the effective date of the updated Terms constitutes acceptance of the changes. If you do not agree to the updated Terms, you must stop using the Service before the effective date.</p>

        <div style={s.h2}>23. General Provisions</div>
        <ul style={s.ul}>
          <li style={s.li}><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and any other agreements or policies we link to from them, constitute the entire agreement between you and TradeVoice regarding the Service and supersede all prior agreements and understandings.</li>
          <li style={s.li}><strong>Severability.</strong> If any provision of these Terms is held invalid or unenforceable by a court of competent jurisdiction, the remaining provisions will continue in full force, and the invalid provision will be modified to reflect the parties' original intent to the fullest extent permitted by law.</li>
          <li style={s.li}><strong>No waiver.</strong> Our failure to enforce any provision of these Terms is not a waiver of our right to do so later.</li>
          <li style={s.li}><strong>Assignment.</strong> You may not assign these Terms or any rights under them without our prior written consent. We may assign these Terms to an affiliate, in connection with a merger or acquisition, or to a successor to substantially all of our business, without your consent.</li>
          <li style={s.li}><strong>No agency.</strong> Nothing in these Terms creates an agency, partnership, joint venture, franchise, or employment relationship between you and TradeVoice. We are not a party to any contract you have with your Customers.</li>
          <li style={s.li}><strong>Notices to you.</strong> We will provide notices required under these Terms to your account email or by posting in the platform. Notices to us must be sent to <strong>legal@thetradevoice.com</strong> with a copy to Tiny's Apps LLC at the registered business address on file with the State of Alabama (or any successor state of formation).</li>
          <li style={s.li}><strong>Export controls.</strong> You agree not to use or export the Service in violation of U.S. export-control laws.</li>
          <li style={s.li}><strong>Government users.</strong> If you are a U.S. government entity, the Service is "commercial computer software" and "commercial computer software documentation" subject to the standard end-user-license terms set forth in these Terms, not to any government-rights provisions.</li>
        </ul>

        <div style={s.contact}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2d6a4f', marginBottom: 8 }}>How to reach us</div>
          <div style={{ fontSize: 15, color: '#444', lineHeight: 1.8 }}>
            <div><strong>support@thetradevoice.com</strong> — general product help, bugs, feature questions</div>
            <div><strong>billing@thetradevoice.com</strong> — subscription billing, payment-method changes, routine cancellations</div>
            <div><strong>privacy@thetradevoice.com</strong> — privacy-rights requests, data exports, deletion under CCPA / state laws</div>
            <div><strong>legal@thetradevoice.com</strong> — DMCA notices, disputes, arbitration opt-out, formal legal notices</div>
            <div><strong>security@thetradevoice.com</strong> — vulnerability reports, coordinated security disclosures</div>
            <div style={{ marginTop: 10, color: '#666', fontSize: 14 }}>Tiny's Apps LLC · thetradevoice.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
