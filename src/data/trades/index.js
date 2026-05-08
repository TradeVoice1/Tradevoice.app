// ─── Trade catalog ───────────────────────────────────────────────────────────
// One file per trade. This index assembles them into the TRADE_CONFIG object
// that App.jsx (and quote/invoice docs, marketing site, etc.) consume.
//
// Adding a new trade:
//   1. Create src/data/trades/<key>.js exporting { color, stripe, label, ... }
//   2. Import it here and add to TRADE_CONFIG below
//   3. Add the key to ALL_TRADES + the right bucket in TRADE_CATEGORIES
//
// Convention:
//   - Existing 5 trades (Plumber/Electrician/HVAC/Roofing/Specialty) keep their
//     hand-curated material/equipment libraries WITH prices so the contractor
//     has a sensible starting point.
//   - Newly added trades default to BLANK prices (cost: 0 / rate: 0) per the
//     user's preference — descriptions and units only, contractor fills in
//     their actual prices the first time they use a line item.
//   - Labor rates are kept as sensible national averages (BLS-derived) since
//     a $0 default rate would force the contractor to type their rate every
//     time they add a labor row.

import plumber     from './plumber.js';
import electrician from './electrician.js';
import hvac        from './hvac.js';
import roofing     from './roofing.js';
import specialty   from './specialty.js';
import bundle      from './bundle.js';
// Construction batch 1 — core build-out trades.
import carpenter   from './carpenter.js';
import painter     from './painter.js';
import drywall     from './drywall.js';
import flooring    from './flooring.js';
import tile        from './tile.js';
import concrete    from './concrete.js';
import mason       from './mason.js';
import insulation  from './insulation.js';
import siding      from './siding.js';
import gutters     from './gutters.js';
// Construction batch 2 — exterior + heavy.
import solar         from './solar.js';
import stucco        from './stucco.js';
import garageDoor    from './garage-door.js';
import fence         from './fence.js';
import deck          from './deck.js';
import foundation    from './foundation.js';
import waterproofing from './waterproofing.js';
import excavation    from './excavation.js';
import demolition    from './demolition.js';
import sheetMetal    from './sheet-metal.js';

// ── TRADE_CONFIG — keys must match what's stored on user.trades / quote.trade ──
export const TRADE_CONFIG = {
  Plumber:     plumber,
  Electrician: electrician,
  HVAC:        hvac,
  Roofing:     roofing,
  Specialty:   specialty,
  Carpenter:   carpenter,
  Painter:     painter,
  Drywall:     drywall,
  Flooring:    flooring,
  Tile:        tile,
  Concrete:    concrete,
  Mason:       mason,
  Insulation:  insulation,
  Siding:      siding,
  Gutters:     gutters,
  Solar:         solar,
  Stucco:        stucco,
  GarageDoor:    garageDoor,
  Fence:         fence,
  Deck:          deck,
  Foundation:    foundation,
  Waterproofing: waterproofing,
  Excavation:    excavation,
  Demolition:    demolition,
  SheetMetal:    sheetMetal,
  bundle,
};

// All real trade keys — excludes the virtual 'bundle' aggregate. Used for
// dropdowns, picker UIs, and bundle scoping.
export const ALL_TRADES = Object.keys(TRADE_CONFIG).filter(k => k !== 'bundle');

// Category groupings for the trade picker UI. As the catalog grows past
// ~25 entries we'll need search + category tabs in SignupScreen and
// elsewhere. The categories themselves come from each trade's `category`
// field; this helper groups them so the picker can render headed groups.
export const TRADE_CATEGORIES = (() => {
  const groups = {};
  for (const key of ALL_TRADES) {
    const cat = TRADE_CONFIG[key].category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(key);
  }
  return groups;
})();

// Helper — resolve config for a quote's trade value and the user's trade list.
// For 'bundle' (multi-trade) quotes we BUILD the config dynamically so the
// libraries only show items from the trades this contractor actually offers.
export function getTradeConfig(trade, userTrades = []) {
  if (trade !== 'bundle') return TRADE_CONFIG[trade] || TRADE_CONFIG.Specialty;

  const scoped = (userTrades && userTrades.length ? userTrades : ALL_TRADES)
    .filter(t => TRADE_CONFIG[t]);
  return {
    ...TRADE_CONFIG.bundle,
    matLibrary:   scoped.flatMap(t => TRADE_CONFIG[t].matLibrary.map(i  => ({ ...i, id: `b${t}-${i.id}`, _trade: t }))),
    equipLibrary: scoped.flatMap(t => TRADE_CONFIG[t].equipLibrary.map(i => ({ ...i, id: `b${t}-${i.id}`, _trade: t }))),
    _scopedTrades: scoped,
  };
}

// True when the user has multiple trades and the quote is flagged as multi-trade
// (or they have so many trades that single-trade selection is impractical).
export function isMultiTradeUser(userTrades = []) {
  return (userTrades?.length ?? 0) >= 2;
}
