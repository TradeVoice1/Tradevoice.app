// Insulation — fiberglass batt, blown-in cellulose/fiberglass, spray foam (open & closed cell),
// rigid foam, attic/wall/crawlspace. Reference: ASTM C665/C518, IECC code, ICAA standards.
// Labor rate per BLS 47-2131 ($70/hr typical).

export default {
  color:            '#fbbf24',
  stripe:           'linear-gradient(90deg, #f59e0b, #fde047)',
  label:            'Insulation',
  docLabel:         'Insulation Services',
  category:         'Construction',
  defaultLaborRate: 70,
  laborTitle:       'Insulation Labor',
  licenseNote:      'Insulation Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the insulation scope — material type (fiberglass batt, blown cellulose, open/closed cell spray foam, rigid foam), R-value, locations (attic, walls, crawlspace, rim joist), square footage, air-sealing/vapor barrier work included, and any inspection/permit requirements.',
  matLibrary: [
    { id: 'inm1',  desc: 'R-13 Fiberglass Batt (Sq Ft)',            qty: 1, unit: 'sf', cost: 0 },
    { id: 'inm2',  desc: 'R-19 Fiberglass Batt (Sq Ft)',            qty: 1, unit: 'sf', cost: 0 },
    { id: 'inm3',  desc: 'R-30 Fiberglass Batt (Sq Ft)',            qty: 1, unit: 'sf', cost: 0 },
    { id: 'inm4',  desc: 'Blown Cellulose (Bag)',                   qty: 1, unit: 'bag',cost: 0 },
    { id: 'inm5',  desc: 'Blown Fiberglass (Bag)',                  qty: 1, unit: 'bag',cost: 0 },
    { id: 'inm6',  desc: 'Closed-Cell Spray Foam (Set)',             qty: 1, unit: 'set',cost: 0 },
    { id: 'inm7',  desc: 'Open-Cell Spray Foam (Set)',               qty: 1, unit: 'set',cost: 0 },
    { id: 'inm8',  desc: 'Rigid Foam Board 4x8 1.5"',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'inm9',  desc: 'Vapor Barrier 6-Mil (Roll)',               qty: 1, unit: 'roll',cost: 0 },
    { id: 'inm10', desc: 'Spray Foam Can 16oz (Gap Seal)',           qty: 1, unit: 'ea', cost: 0 },
    { id: 'inm11', desc: 'House Wrap (Roll, 3x100)',                 qty: 1, unit: 'roll',cost: 0 },
    { id: 'inm12', desc: 'Foil Tape / Vapor Barrier Tape',           qty: 1, unit: 'roll',cost: 0 },
    { id: 'inm13', desc: 'Misc Insulation Supplies',                 qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'ine1', desc: 'Insulation Blower / Hopper Rental', qty: 1, unit: 'day', rate: 0 },
    { id: 'ine2', desc: 'Spray Foam Rig (Truck-mounted)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'ine3', desc: 'PPE / Tyvek Suit Set',                qty: 1, unit: 'day', rate: 0 },
    { id: 'ine4', desc: 'Respirator + Cartridges',             qty: 1, unit: 'day', rate: 0 },
    { id: 'ine5', desc: 'Attic Walkway Boards (Set)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'ine6', desc: 'Negative Air Machine / HEPA',         qty: 1, unit: 'day', rate: 0 },
  ],
};
