// Elite-tier feature: drag-drop a scope PDF, get a synthesized
// scope-of-work back via Claude + Perplexity. Renders inside the
// QuoteEditor's Scope tab.
//
// Flow:
//   1. Contractor drops/picks a PDF (≤25MB)
//   2. We upload it directly from the browser to Supabase Storage
//      (scope-pdfs bucket — migration 0038). RLS scopes to owner.
//   3. POST /api/quotes/analyze-scope with the storage path. The
//      endpoint downloads the PDF, runs Claude → Perplexity →
//      Claude synthesis, returns all three outputs.
//   4. Three-panel preview opens — extraction, research with
//      citations, synthesized scope. Contractor reviews + clicks
//      "Use This Scope" to insert the synthesis into the quote.
//   5. PDF is deleted from storage on close (we don't need to
//      keep it once analyzed — saves storage cost).

import React, { useState } from "react";
import { supabase } from "./supabase";
import { authedFetch } from "./lib/authedFetch";
import { can } from "./lib/tier";
import { upsertProfile } from "./data/auth";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB — matches bucket limit in migration 0038

export default function ScopeAnalyzer({ user, setUser, onInsertScope }) {
  // Gate: Elite tier only. Solo/Pro see a teaser with upgrade prompt
  // (calling out the feature so they know it exists). Founder
  // account is treated as Elite by the tier helper.
  if (!can(user, 'hasAiQuoteDrafting')) {
    return (
      <div style={{
        background: '#fffbeb', border: '1.5px solid #fde68a',
        borderRadius: 10, padding: '14px 18px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 30 }}>🤖</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400e', marginBottom: 4 }}>
            Elite feature
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>
            AI scope analysis — drop a PDF, get a precise scope of work
          </div>
          <div style={{ fontSize: 15, color: '#92400e', marginTop: 4 }}>
            Claude reads the document, Perplexity researches current codes + standards, both AIs collaborate on a synthesized scope you can paste into the quote. Available on the Elite plan.
          </div>
        </div>
      </div>
    );
  }

  return <ScopeAnalyzerActive user={user} setUser={setUser} onInsertScope={onInsertScope} />;
}

function ScopeAnalyzerActive({ user, setUser, onInsertScope }) {
  // 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error'
  const [phase, setPhase]   = useState('idle');
  const [error, setError]   = useState('');
  // The three AI outputs once the chain completes.
  const [result, setResult] = useState(null);   // { extraction, research, citations, synthesis }
  // Storage path of the currently-uploaded PDF, so we can clean it
  // up if the contractor closes without inserting.
  const [storagePath, setStoragePath] = useState(null);
  const [fileName, setFileName]       = useState('');

  // Consent gate — Terms section 10 "AI-Assisted Features" requires
  // the contractor to acknowledge the advisory-only nature of AI
  // output BEFORE first use. After agreement (stamps
  // ai_scope_terms_accepted_at on the profile), the modal doesn't
  // re-show; the persistent disclaimer banner stays visible above
  // the drop zone as a continuous reminder.
  const [showConsentModal, setShowConsentModal] = useState(false);
  const hasAccepted = !!user?.aiScopeTermsAcceptedAt;
  const [savingConsent, setSavingConsent] = useState(false);

  const handleAcceptTerms = async () => {
    if (savingConsent) return;
    setSavingConsent(true);
    try {
      const now = new Date().toISOString();
      // Persist to DB so the consent survives session restore.
      const updated = await upsertProfile(user.id, {
        ...user,
        aiScopeTermsAcceptedAt: now,
      });
      // Reflect in app state so the modal closes without a refresh.
      if (setUser) setUser(prev => prev ? { ...prev, ...updated, aiScopeTermsAcceptedAt: now } : prev);
      setShowConsentModal(false);
    } catch (e) {
      alert(e?.message || 'Could not save your agreement. Try again.');
    } finally {
      setSavingConsent(false);
    }
  };

  // Cleanup helper — deletes the PDF from Supabase Storage. Best-
  // effort; we don't crash if it fails (orphaned files are cosmetic).
  const cleanup = async (path) => {
    if (!path) return;
    try {
      await supabase.storage.from('scope-pdfs').remove([path]);
    } catch (_) { /* ignore */ }
  };

  const handleFile = async (file) => {
    if (!file) return;
    // Gate first use behind the consent modal. After agreement is
    // stamped on the profile, subsequent uses skip this and go
    // straight to upload. The persistent banner still reminds.
    if (!hasAccepted) {
      setShowConsentModal(true);
      // Stash the file for after-consent retry? — actually, simpler
      // UX: just have them re-drop after agreeing. One extra click
      // for first-time use, zero risk of accidentally processing
      // a file before consent was recorded.
      return;
    }
    setError('');
    // Validate type + size before uploading.
    if (file.type !== 'application/pdf') {
      setError('File must be a PDF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`PDF is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 25 MB.`);
      return;
    }
    setFileName(file.name);

    // ── Upload to Supabase Storage ──────────────────────────────────
    setPhase('uploading');
    // Path includes the user_id prefix so the RLS policy on
    // scope-pdfs accepts the upload. Add a timestamp suffix so
    // re-uploading the same filename doesn't collide.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const path     = `${user.id}/${Date.now()}_${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('scope-pdfs')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (upErr) {
      setError(upErr.message || 'Upload failed.');
      setPhase('error');
      return;
    }
    setStoragePath(path);

    // ── Call the analyzer endpoint ──────────────────────────────────
    setPhase('analyzing');
    try {
      const r = await authedFetch('/api/quotes/analyze-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: path }),
      });
      const j = await r.json();
      if (!r.ok) {
        if (j?.error === 'elite_tier_required') {
          setError('AI scope analysis is an Elite-tier feature. Upgrade your plan to use it.');
        } else {
          setError(j?.detail || j?.error || 'Analysis failed.');
        }
        setPhase('error');
        cleanup(path);
        setStoragePath(null);
        return;
      }
      setResult(j);
      setPhase('ready');
    } catch (e) {
      setError(e?.message || 'Network error.');
      setPhase('error');
      cleanup(path);
      setStoragePath(null);
    }
  };

  const handleInsert = () => {
    if (result?.synthesis && onInsertScope) {
      onInsertScope(result.synthesis);
    }
    // Clean up the PDF after a successful insertion — we already
    // have everything we need from it.
    cleanup(storagePath);
    setStoragePath(null);
    setResult(null);
    setPhase('idle');
    setFileName('');
  };
  const handleDiscard = () => {
    cleanup(storagePath);
    setStoragePath(null);
    setResult(null);
    setPhase('idle');
    setFileName('');
    setError('');
  };

  // ── Drag & drop handlers ────────────────────────────────────────
  const [dragOver, setDragOver] = useState(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  // ── Render the three-panel preview when result is ready ─────────
  if (phase === 'ready' && result) {
    return (
      <div style={{ marginBottom: 18, border: '1.5px solid #bbf7d0', borderRadius: 12, background: '#f7fcf9', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#15803d', marginBottom: 4 }}>
              AI Analysis Complete
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{fileName}</div>
          </div>
          <button type="button" onClick={handleDiscard} style={ghostBtn}>Discard</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <Panel title="1. What's in the document" subtitle="Claude vision" body={result.extraction} />
          <Panel
            title="2. Code + standards context"
            subtitle="Perplexity online research"
            body={result.research}
            citations={result.citations}
          />
          <Panel
            title="3. Recommended scope of work"
            subtitle="Synthesized — paste this into the quote"
            body={result.synthesis}
            highlight
          />
        </div>

        {/* Disclaimer — required for liability. AI hallucinations are real. */}
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 14, color: '#92400e', lineHeight: 1.55 }}>
          ⚠ AI-generated. Review against your jurisdiction's requirements before sending to the customer. Citations link to common references but do not guarantee compliance.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
          <button type="button" onClick={handleDiscard} style={ghostBtn}>Cancel</button>
          <button type="button" onClick={handleInsert} style={primaryBtn}>Use Recommended Scope →</button>
        </div>
      </div>
    );
  }

  // ── Drop zone (idle / uploading / analyzing / error) ───────────
  return (
    <div style={{ marginBottom: 14 }}>
      {/* Consent modal — Terms section 10 first-use gate. Renders
          only when the contractor hasn't yet stamped
          ai_scope_terms_accepted_at on their profile. */}
      {showConsentModal && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000000bb',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '28px 30px',
            maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 34 }}>🤖</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#92400e' }}>
                  Before you use AI scope analysis
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111', marginTop: 2 }}>
                  Please review and agree
                </div>
              </div>
            </div>

            <p style={{ fontSize: 16, color: '#222', lineHeight: 1.7, marginBottom: 14 }}>
              The AI Scope Analyzer uses Anthropic Claude (PDF reading)
              and Perplexity AI (code research) to draft a scope of work
              for your review. <strong>It is not a substitute for your
              professional judgment.</strong> By using this feature you
              acknowledge and agree that:
            </p>

            <ul style={{ paddingLeft: 22, marginBottom: 14, color: '#222', fontSize: 16, lineHeight: 1.7 }}>
              <li><strong>AI output is advisory only.</strong> It may contain errors, hallucinations, outdated code citations, wrong dimensions, or work items inappropriate for your jurisdiction or the actual job.</li>
              <li><strong>You will review every line</strong> before using it in a quote, invoice, customer communication, or work decision.</li>
              <li><strong>You will verify any code or standards reference</strong> against the cited source and your local jurisdiction before relying on it.</li>
              <li><strong>You are solely responsible</strong> for the content of any quote, invoice, or scope of work you send to a customer — regardless of whether you used AI to draft it.</li>
              <li><strong>TradeVoice, Tiny's Apps LLC, Anthropic, and Perplexity</strong> are not liable for damages, code violations, permit denials, customer disputes, fines, or other consequences arising from your use of or reliance on AI-generated content, even if the output contained errors.</li>
              <li><strong>The PDF you upload</strong> is sent to Anthropic for processing and its extracted text to Perplexity for research. We delete the uploaded PDF after analysis. Don't upload documents with third-party PII without consent.</li>
            </ul>

            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 18 }}>
              Full terms in section 10 of our{' '}
              <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#2d6a4f', fontWeight: 700 }}>Terms of Service</a>.
              Data handling in section 5 of our{' '}
              <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#2d6a4f', fontWeight: 700 }}>Privacy Policy</a>.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                disabled={savingConsent}
                style={ghostBtn}
              >Cancel</button>
              <button
                type="button"
                onClick={handleAcceptTerms}
                disabled={savingConsent}
                style={{ ...primaryBtn, opacity: savingConsent ? 0.6 : 1, cursor: savingConsent ? 'wait' : 'pointer' }}
              >
                {savingConsent ? 'Saving…' : 'I agree — continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent disclaimer banner — visible on every use, even
          after consent is stamped. Keeps the legal context in front
          of the contractor's eyes without being a blocking modal. */}
      {hasAccepted && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 10,
          fontSize: 14, color: '#92400e', lineHeight: 1.55,
        }}>
          ⚠ AI output is advisory only. You agreed on{' '}
          {new Date(user.aiScopeTermsAcceptedAt).toLocaleDateString()} to review
          every line before using it. We are not liable for errors in AI-generated content.{' '}
          <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#92400e', textDecoration: 'underline', fontWeight: 700 }}>Terms § 10</a>.
        </div>
      )}

      <label
        htmlFor="scope-pdf-upload"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          display: 'block',
          border: `1.5px dashed ${dragOver ? '#15803d' : '#bbb'}`,
          background: dragOver ? '#f0fdf4' : '#fafaf7',
          borderRadius: 12,
          padding: '20px 18px',
          cursor: phase === 'idle' ? 'pointer' : 'default',
          textAlign: 'center',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <input
          id="scope-pdf-upload"
          type="file"
          accept="application/pdf"
          disabled={phase === 'uploading' || phase === 'analyzing'}
          onChange={(e) => handleFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 28, marginBottom: 6 }}>🤖</div>
        {phase === 'idle' && (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              Drop a scope PDF or click to upload
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.55 }}>
              Claude + Perplexity will read it, research current codes and standards, and write a precise scope-of-work for this quote. Max 25 MB. ~20-45 seconds.
            </div>
          </>
        )}
        {phase === 'uploading' && (
          <div style={{ fontSize: 16, color: '#666', fontWeight: 600 }}>Uploading {fileName}…</div>
        )}
        {phase === 'analyzing' && (
          <>
            <div style={{ fontSize: 16, color: '#15803d', fontWeight: 700, marginBottom: 4 }}>
              Analyzing {fileName}…
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.55 }}>
              Claude is reading the PDF, then Perplexity researches current codes, then both AIs collaborate on the scope. This usually takes 20-45 seconds — don't close the tab.
            </div>
          </>
        )}
        {phase === 'error' && (
          <div style={{ fontSize: 16, color: '#dc2626', fontWeight: 600 }}>
            {error || 'Something went wrong.'}
            <div style={{ fontSize: 14, color: '#666', fontWeight: 400, marginTop: 4 }}>Click to try again.</div>
          </div>
        )}
      </label>
    </div>
  );
}

function Panel({ title, subtitle, body, citations, highlight }) {
  return (
    <div style={{
      background: highlight ? '#fff' : '#fafaf7',
      border: `1px solid ${highlight ? '#bbf7d0' : '#e5e5e0'}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>{subtitle}</div>
      </div>
      <div style={{
        fontSize: 15, color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        maxHeight: highlight ? 'none' : 220,
        overflow: highlight ? 'visible' : 'auto',
      }}>
        {body}
      </div>
      {citations && citations.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e5e0' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
            Citations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {citations.map((c, i) => (
              <a
                key={i}
                href={typeof c === 'string' ? c : c.url}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 14, color: '#1d4ed8', wordBreak: 'break-all' }}
              >
                [{i + 1}] {typeof c === 'string' ? c : (c.title || c.url)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtn = {
  padding: '10px 18px', background: '#15803d', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtn = {
  padding: '10px 16px', background: '#fff', color: '#666',
  border: '1px solid #ddd', borderRadius: 8, fontSize: 16, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
