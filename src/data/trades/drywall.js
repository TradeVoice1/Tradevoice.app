// Drywall — hanging, finishing, texturing, repair, soundproofing, level-5 finish.
// Reference: GA-216 (Gypsum Association — Application & Finishing of Gypsum Panels),
// ASTM C840. Labor rate per BLS 47-2081 ($70/hr typical).

export default {
  color:            '#64748b',
  stripe:           'linear-gradient(90deg, #475569, #94a3b8)',
  label:            'Drywall',
  docLabel:         'Drywall Services',
  category:         'Construction',
  defaultLaborRate: 70,
  laborTitle:       'Drywall Labor',
  licenseNote:      'Licensed Drywall Contractor',
  scopePlaceholder: 'Describe the drywall work — hang, tape, mud, sand, texture (knockdown / orange peel / smooth), repair, level 4 vs level 5 finish, etc. Specify wall vs ceiling square footage, paint-ready condition, and prep included.',
  matLibrary: [
    { id: 'dwm1',  desc: '1/2" Drywall 4x8 Sheet',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dwm2',  desc: '5/8" Type X Drywall 4x8 Sheet',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dwm3',  desc: 'Moisture-Resistant Greenboard 4x8',        qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dwm4',  desc: 'Joint Compound (5 Gallon Bucket)',         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dwm5',  desc: 'Setting-Type Compound 20-min (Bag)',       qty: 1, unit: 'bag', cost: 0 },
    { id: 'dwm6',  desc: 'Paper Joint Tape 250ft Roll',              qty: 1, unit: 'roll',cost: 0 },
    { id: 'dwm7',  desc: 'Mesh Joint Tape 300ft Roll',               qty: 1, unit: 'roll',cost: 0 },
    { id: 'dwm8',  desc: 'Drywall Screws 1-5/8" (5lb Box)',          qty: 1, unit: 'box', cost: 0 },
    { id: 'dwm9',  desc: 'Corner Bead 8ft (Metal)',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dwm10', desc: 'Sandpaper 220-Grit (Pack)',                qty: 1, unit: 'pk',  cost: 0 },
    { id: 'dwm11', desc: 'Texture Spray Material (Bag)',             qty: 1, unit: 'bag', cost: 0 },
    { id: 'dwm12', desc: 'Misc Drywall Consumables',                 qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'dwe1', desc: 'Drywall Lift / Panel Hoist',       qty: 1, unit: 'day', rate: 0 },
    { id: 'dwe2', desc: 'Drywall Sander (HEPA Vacuum)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'dwe3', desc: 'Mud Mixer / Paddle Drill',          qty: 1, unit: 'day', rate: 0 },
    { id: 'dwe4', desc: 'Texture Spray Hopper Gun',          qty: 1, unit: 'day', rate: 0 },
    { id: 'dwe5', desc: 'Stilts (Pair, Adjustable)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'dwe6', desc: 'Scaffolding Set',                   qty: 1, unit: 'day', rate: 0 },
  ],
};
