// Handyman — small repairs, installation, mounting, mixed light-trade work.
// Reference: Generally requires no specific cert; state handyman license caps apply
// (typically <$500-$5000/job depending on state). Labor rate $65/hr typical.

export default {
  color:            '#ea580c',
  stripe:           'linear-gradient(90deg, #c2410c, #fb923c)',
  label:            'Handyman',
  docLabel:         'Handyman Services',
  category:         'Service',
  defaultLaborRate: 65,
  laborTitle:       'Handyman Labor',
  licenseNote:      'Insured Handyman — Licensed Where Required',
  scopePlaceholder: 'Describe the handyman scope — list specific tasks (TV mounting, faucet swap, ceiling fan, picture hanging, paint touch-up, deck repair, etc). Note any minor electrical or plumbing within state-license thresholds, materials supplied vs customer-provided.',
  matLibrary: [
    { id: 'hdm1', desc: 'Wall Anchors / Toggle Bolts (Pack)',       qty: 1, unit: 'pk', cost: 0 },
    { id: 'hdm2', desc: 'Caulk / Sealant (Tube)',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'hdm3', desc: 'Wood Screws (Box)',                         qty: 1, unit: 'box',cost: 0 },
    { id: 'hdm4', desc: 'Drywall Patch Kit',                         qty: 1, unit: 'ea', cost: 0 },
    { id: 'hdm5', desc: 'Wood Stain / Touch-Up Marker',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'hdm6', desc: 'Misc Hardware',                             qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'hde1', desc: 'Cordless Drill / Impact Set',         qty: 1, unit: 'day', rate: 0 },
    { id: 'hde2', desc: 'Stud Finder / Laser Level',           qty: 1, unit: 'day', rate: 0 },
    { id: 'hde3', desc: 'Multi-Tool / Oscillating Saw',         qty: 1, unit: 'day', rate: 0 },
    { id: 'hde4', desc: 'Tile Saw (Small)',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'hde5', desc: 'Step Ladder 8ft',                     qty: 1, unit: 'day', rate: 0 },
  ],
};
