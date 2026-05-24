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

const MAX_BYTES = 25 * 1024 * 1024; // 25MB — matches bucket limit in migration 0038

export default function ScopeAnalyzer({ user, onInsertScope }) {
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
        <div style={{ fontSize: 28 }}>🤖</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#92400e', marginBottom: 4 }}>
            Elite feature
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
            AI scope analysis — drop a PDF, get a precise scope of work
          </div>
          <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
            Claude reads the document, Perplexity researches current codes + standards, both AIs collaborate on a synthesized scope you can paste into the quote. Available on the Elite plan.
          </div>
        </div>
      </div>
    );
  }

  return <ScopeAnalyzerActive user={user} onInsertScope={onInsertScope} />;
}

function ScopeAnalyzerActive({ user, onInsertScope }) {
  // 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error'
  const [phase, setPhase]   = useState('idle');
  const [error, setError]   = useState('');
  // The three AI outputs once the chain completes.
  const [result, setResult] = useState(null);   // { extraction, research, citations, synthesis }
  // Storage path of the currently-uploaded PDF, so we can clean it
  // up if the contractor closes without inserting.
  const [storagePath, setStoragePath] = useState(null);
  const [fileName, setFileName]       = useState('');

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
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#15803d', marginBottom: 4 }}>
              AI Analysis Complete
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{fileName}</div>
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
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.55 }}>
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
        <div style={{ fontSize: 26, marginBottom: 6 }}>🤖</div>
        {phase === 'idle' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>
              Drop a scope PDF or click to upload
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>
              Claude + Perplexity will read it, research current codes and standards, and write a precise scope-of-work for this quote. Max 25 MB. ~20-45 seconds.
            </div>
          </>
        )}
        {phase === 'uploading' && (
          <div style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>Uploading {fileName}…</div>
        )}
        {phase === 'analyzing' && (
          <>
            <div style={{ fontSize: 14, color: '#15803d', fontWeight: 700, marginBottom: 4 }}>
              Analyzing {fileName}…
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.55 }}>
              Claude is reading the PDF, then Perplexity researches current codes, then both AIs collaborate on the scope. This usually takes 20-45 seconds — don't close the tab.
            </div>
          </>
        )}
        {phase === 'error' && (
          <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>
            {error || 'Something went wrong.'}
            <div style={{ fontSize: 12, color: '#666', fontWeight: 400, marginTop: 4 }}>Click to try again.</div>
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
        <div style={{ fontSize: 13, fontWeight: 800, color: '#111' }}>{title}</div>
        <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>{subtitle}</div>
      </div>
      <div style={{
        fontSize: 13, color: '#222', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        maxHeight: highlight ? 'none' : 220,
        overflow: highlight ? 'visible' : 'auto',
      }}>
        {body}
      </div>
      {citations && citations.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e5e0' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>
            Citations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {citations.map((c, i) => (
              <a
                key={i}
                href={typeof c === 'string' ? c : c.url}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#1d4ed8', wordBreak: 'break-all' }}
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
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
};
const ghostBtn = {
  padding: '10px 16px', background: '#fff', color: '#666',
  border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
