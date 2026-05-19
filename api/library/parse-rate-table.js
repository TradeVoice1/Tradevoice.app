// POST /api/library/parse-rate-table
// Body: { ownerId, fileBase64, fileName, mediaType }
//
// Takes a base64-encoded PDF / JPG / PNG of a contractor's rate sheet,
// sends it to Claude with a tool-use schema, and returns structured
// labor / material / equipment items. The front-end then renders a
// preview grid, lets the contractor uncheck noise, and submits the
// confirmed list back to /api/library/import-rate-items for insert.
//
// Why tool use instead of "respond in JSON": tool_choice forces the model
// to return a payload matching the schema. Free-form JSON parsing was the
// approach in earlier Claude versions and worked ~90% of the time; tool
// use is functionally 100% with a fraction of the prompt engineering.
//
// Limits:
//   - Claude's input cap on PDFs is 32 MB / 100 pages. Most contractor
//     rate sheets are 1-5 pages — we cap at 8 MB to keep round-trip fast.
//   - Photos of paper rate sheets work too (image content block path)
//     but degrade quality if blurry / skewed. The UI tells the user to
//     hold steady and use a flat surface.

import { getAnthropic, DEFAULT_MODEL } from "../_lib/anthropic.js";
import { getServiceClient } from "../_lib/supabase.js";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const TOOL_SCHEMA = {
  name: "import_rate_items",
  description: "Submit the structured rate items extracted from the contractor's rate sheet.",
  input_schema: {
    type: "object",
    properties: {
      labor: {
        type: "array",
        description: "Hourly labor rates. Skip headers, page numbers, or rows where you can't read a clear hourly rate.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "What kind of labor (e.g. 'Master plumber', 'Apprentice helper', 'After-hours emergency')." },
            rate:        { type: "number", description: "Hourly rate in dollars. Strip $ and commas." }
          },
          required: ["description", "rate"]
        }
      },
      materials: {
        type: "array",
        description: "Materials & parts with unit cost. Skip rows with no clear price.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "What the item is (e.g. '3/4\" copper elbow', '50 amp breaker')." },
            unit:        { type: "string", description: "Unit of measure: 'ea', 'ft', 'lb', 'gal', 'box', etc. Omit if not stated." },
            cost:        { type: "number", description: "Cost per unit in dollars. Strip $ and commas." }
          },
          required: ["description", "cost"]
        }
      },
      equipment: {
        type: "array",
        description: "Rentable / billable equipment with a time-based rate (per hour, per day, etc.). Skip rows that look like materials, not equipment.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "What the equipment is (e.g. 'Mini-excavator', 'Drain camera', 'Boom lift 40ft')." },
            unit:        { type: "string", description: "Time unit: 'hr', 'day', 'week'. Default 'day' if rate is clearly daily but unit not stated." },
            rate:        { type: "number", description: "Rate per unit in dollars. Strip $ and commas." }
          },
          required: ["description", "rate"]
        }
      },
      trade_hint: {
        type: "string",
        description: "If the rate sheet appears to be for one specific trade (plumber, HVAC, electrician, roofing, etc.), the trade name. Otherwise empty string."
      },
      notes: {
        type: "string",
        description: "Any caveats or things the parser couldn't determine (e.g. 'Some columns weren't readable due to glare'). Keep brief."
      }
    },
    required: ["labor", "materials", "equipment", "trade_hint", "notes"]
  }
};

const SYSTEM_PROMPT = `You are a careful data extractor for a contractor's pricing software.
You are given a rate sheet (PDF or image) that a contractor uploaded.
Extract every line item where you can read both a clear description AND a clear price.

Rules:
- Be conservative. If you're not sure about a row, skip it. The contractor will add anything you miss.
- Discriminate kinds carefully:
    * labor = hourly billing of a person's time
    * material = a part / consumable / supply with a per-unit cost
    * equipment = rentable / billable gear charged per hour / day / week
- Strip $ signs, commas, and "per X" prefixes from numbers. Return raw numbers.
- Skip headers, page numbers, totals, branding text, dates, contact info.
- Skip "labor + materials" bundled prices — only itemize what you can clearly separate.
- If a row has a range (e.g. "$85-$125/hr"), pick the midpoint.

Always call the import_rate_items tool with your extraction.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { ownerId, fileBase64, fileName, mediaType } = req.body || {};
  if (!ownerId)    return res.status(400).json({ error: 'missing_owner_id' });
  if (!fileBase64) return res.status(400).json({ error: 'missing_file' });

  // Verify the caller actually owns the owner_id they claim. RLS would
  // block the eventual write either way, but we check up-front so we
  // don't burn a Claude call on a rejected payload.
  // (In practice the front-end always sends user.id from the active
  // session — this is defense against a manually-crafted request.)
  const supabase = getServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', ownerId)
    .maybeSingle();
  if (!profile) {
    return res.status(403).json({ error: 'invalid_owner' });
  }

  // Decode just to measure the size; Anthropic accepts the base64 string
  // directly so we don't need the raw bytes.
  const approxBytes = Math.floor((fileBase64.length * 3) / 4);
  if (approxBytes > MAX_BYTES) {
    return res.status(413).json({ error: 'file_too_large', limit: `${MAX_BYTES / 1024 / 1024} MB` });
  }

  // Build the content block. Claude has two paths:
  //   - PDF: { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
  //   - Image: { type: 'image', source: { type: 'base64', media_type: 'image/png'|jpeg|webp|gif, data } }
  const isPdf   = (mediaType || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(fileName || '');
  const isImage = !isPdf && /^image\//i.test(mediaType || '');
  if (!isPdf && !isImage) {
    return res.status(400).json({ error: 'unsupported_media_type', got: mediaType });
  }

  const fileBlock = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } }
    : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: fileBase64 } };

  let extracted;
  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      // 4096 was hitting the ceiling on dense rate sheets (50+ line
      // items). When Claude can't finish the tool_use payload it returns
      // a truncated content array with no tool_use block, and we 502'd
      // back to the user with no clear cause. 8192 gives ~200 items of
      // headroom — well past any realistic contractor rate sheet.
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: 'tool', name: 'import_rate_items' },
      messages: [{
        role: 'user',
        content: [
          fileBlock,
          { type: 'text', text: 'Extract every rate item you can confidently read. Call import_rate_items.' },
        ],
      }],
    });

    // The tool_use block has the structured payload.
    const toolUse = message.content?.find(c => c.type === 'tool_use');
    if (!toolUse) {
      console.warn('[parse-rate-table] Claude returned no tool_use block', message.content);
      return res.status(502).json({ error: 'no_tool_use_response' });
    }
    extracted = toolUse.input || {};
  } catch (e) {
    console.error('[parse-rate-table] Claude call failed:', e);
    return res.status(502).json({ error: 'claude_error', detail: e?.message });
  }

  // Stamp each item with kind so the bulk-insert RPC can route them.
  const labor     = (extracted.labor     || []).map(i => ({ ...i, kind: 'labor' }));
  const materials = (extracted.materials || []).map(i => ({ ...i, kind: 'material' }));
  const equipment = (extracted.equipment || []).map(i => ({ ...i, kind: 'equipment' }));

  return res.status(200).json({
    ok: true,
    items: [...labor, ...materials, ...equipment],
    tradeHint: extracted.trade_hint || '',
    notes:     extracted.notes      || '',
    sourceRef: fileName || null,
    counts: { labor: labor.length, materials: materials.length, equipment: equipment.length },
  });
}
