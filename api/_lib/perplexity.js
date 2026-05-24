// Thin Perplexity API client. Used by /api/quotes/analyze-scope to
// research current building codes + industry-standard line items
// for a contractor's scope-of-work analysis (the second AI in the
// Claude + Perplexity tag-team).
//
// Why Perplexity (not just Claude doing this in one shot): Perplexity's
// online models do real-time web search with citation links back to
// authoritative sources (IRC, NEC, manufacturer specs, state board
// docs). Claude alone can describe what's in the document, but its
// training data is frozen — it can't pull "current 2026 NEC tap rule
// requirements" with a citation. That's what justifies the second
// model in the chain.
//
// Pricing (as of 2026-05-22):
//   • sonar (small online):  $1/M input tokens,  $1/M output
//   • sonar-pro (large):     $3/M input,        $15/M output
// We use sonar (small) by default for cost — scope research doesn't
// need the heavyweight model.

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

// Online model that does real-time web search with citations.
// 'sonar' is the budget tier; bump to 'sonar-pro' if quality issues
// surface on real contractor PDFs.
const DEFAULT_MODEL = 'sonar';

export async function perplexityChat({ messages, model = DEFAULT_MODEL }) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    throw new Error('PERPLEXITY_API_KEY env var not set');
  }
  const res = await fetch(PERPLEXITY_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      // Keep responses concise — we're researching specifics, not
      // generating prose. The synthesis step (Claude) does the
      // writing.
      max_tokens: 2000,
      temperature: 0.2,
      // Request citation URLs alongside the content so we can show
      // the contractor where the standards info came from.
      return_citations: true,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Perplexity API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = await res.json();
  const text       = json.choices?.[0]?.message?.content || '';
  // Perplexity surfaces citations either at the response level or
  // inline as [1] [2] markers depending on the model. Pull whichever
  // is present.
  const citations = Array.isArray(json.citations) ? json.citations
                  : Array.isArray(json.choices?.[0]?.message?.citations) ? json.choices[0].message.citations
                  : [];
  return { text, citations };
}
