// Gutters — seamless aluminum, copper, sectional; downspouts, leaf guards, repair.
// Reference: SMACNA Architectural Sheet Metal Manual, ARCA standards.
// Labor rate per BLS 47-2181 ($70/hr typical for installer).

export default {
  color:            '#06b6d4',
  stripe:           'linear-gradient(90deg, #0891b2, #67e8f9)',
  label:            'Gutters',
  docLabel:         'Gutter Services',
  category:         'Construction',
  defaultLaborRate: 70,
  laborTitle:       'Gutter Labor',
  licenseNote:      'Gutter Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the gutter scope — full replacement vs repair, linear feet of gutter, number of downspouts, gutter style (K-style, half-round), material (aluminum, copper, steel), color, leaf guard/protection system, and tear-off/haul-away of existing.',
  matLibrary: [
    { id: 'gum1',  desc: 'Seamless Aluminum Gutter 5" (Lin Ft)',     qty: 1, unit: 'lf', cost: 0 },
    { id: 'gum2',  desc: 'Seamless Aluminum Gutter 6" (Lin Ft)',     qty: 1, unit: 'lf', cost: 0 },
    { id: 'gum3',  desc: 'Half-Round Copper Gutter (Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'gum4',  desc: 'Aluminum Downspout 2x3 10ft',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum5',  desc: 'Aluminum Downspout 3x4 10ft',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum6',  desc: 'Inside / Outside Corner Miter',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum7',  desc: 'End Cap (L/R)',                              qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum8',  desc: 'Hidden Hangers 6"',                          qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum9',  desc: 'Downspout Elbow A/B/Offset',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum10', desc: 'Splash Block',                                qty: 1, unit: 'ea', cost: 0 },
    { id: 'gum11', desc: 'Leaf Guard / Gutter Cover (Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'gum12', desc: 'Sealant / Pop Rivets',                        qty: 1, unit: 'lot',cost: 0 },
    { id: 'gum13', desc: 'Misc Gutter Supplies',                        qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'gue1', desc: 'Seamless Gutter Machine (Trailer)', qty: 1, unit: 'day', rate: 0 },
    { id: 'gue2', desc: 'Extension Ladder 28ft',              qty: 1, unit: 'day', rate: 0 },
    { id: 'gue3', desc: 'Pop Rivet Tool',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'gue4', desc: 'Crimper / Snips Set',                qty: 1, unit: 'day', rate: 0 },
    { id: 'gue5', desc: 'Pressure Washer (Cleaning)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'gue6', desc: 'Safety Harness / Roof Anchors',      qty: 1, unit: 'day', rate: 0 },
  ],
};
