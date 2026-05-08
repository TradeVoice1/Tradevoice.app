// Fence — wood, vinyl, chain link, ornamental aluminum/iron, gates, automated.
// Reference: AFA (American Fence Association) Best Practices, ASTM F2453 (vinyl).
// Labor rate per BLS 47-2031 ($70/hr typical).

export default {
  color:            '#65a30d',
  stripe:           'linear-gradient(90deg, #4d7c0f, #84cc16)',
  label:            'Fencing',
  docLabel:         'Fencing Services',
  category:         'Construction',
  defaultLaborRate: 70,
  laborTitle:       'Fencing Labor',
  licenseNote:      'Fencing Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the fence scope — material (wood/vinyl/chain link/aluminum), height, linear feet, post setting (concrete or driven), gates (single, double, with hardware), removal of existing fence, line clearing, and any inspection or HOA requirements.',
  matLibrary: [
    { id: 'fnm1',  desc: 'Cedar Picket 6ft (Each)',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm2',  desc: 'Pressure-Treated Picket 6ft',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm3',  desc: 'Vinyl Privacy Panel 6x8',                  qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm4',  desc: 'Chain Link Mesh 4ft (Per Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'fnm5',  desc: 'Aluminum Ornamental Panel 6x8',             qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm6',  desc: 'PT 4x4x8 Post',                             qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm7',  desc: 'PT 4x4x10 Post',                            qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm8',  desc: 'Vinyl Post w/ Cap',                         qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm9',  desc: 'Concrete Mix 50lb (Post Setting)',          qty: 1, unit: 'bag',cost: 0 },
    { id: 'fnm10', desc: 'Cedar 2x4x8 Rail',                          qty: 1, unit: 'ea', cost: 0 },
    { id: 'fnm11', desc: 'Gate Hardware Kit',                         qty: 1, unit: 'set',cost: 0 },
    { id: 'fnm12', desc: 'Galvanized Screws (5lb Box)',               qty: 1, unit: 'box',cost: 0 },
    { id: 'fnm13', desc: 'Misc Fence Supplies',                       qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'fne1', desc: 'Post Hole Auger (Towable)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'fne2', desc: 'Skid Steer w/ Auger',                qty: 1, unit: 'day', rate: 0 },
    { id: 'fne3', desc: 'Post Driver (Hydraulic)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fne4', desc: 'Cordless Impact Driver Set',          qty: 1, unit: 'day', rate: 0 },
    { id: 'fne5', desc: 'Laser Level / Transit',               qty: 1, unit: 'day', rate: 0 },
    { id: 'fne6', desc: 'Trencher (Walk-Behind)',              qty: 1, unit: 'day', rate: 0 },
  ],
};
