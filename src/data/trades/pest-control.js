// Pest Control — general pest, termite, bedbug, wildlife, mosquito, recurring service.
// Reference: NPMA Best Practices, EPA pesticide certification, state pest license.
// Labor rate per BLS 37-2021 ($85/hr typical, certified applicator).

export default {
  color:            '#a3e635',
  stripe:           'linear-gradient(90deg, #65a30d, #bef264)',
  label:            'Pest Control',
  docLabel:         'Pest Control Services',
  category:         'Service',
  defaultLaborRate: 85,
  laborTitle:       'Pest Control Labor',
  licenseNote:      'State-Licensed Pesticide Applicator',
  scopePlaceholder: 'Describe the pest control scope — service type (general pest, termite pre-treat/post-treat, mosquito, bedbug, wildlife exclusion), property size, perimeter treatment, indoor/outdoor, recurring (monthly/quarterly), warranty/re-treatment terms.',
  matLibrary: [
    { id: 'pcm1',  desc: 'General Insecticide (Concentrate Gal)',    qty: 1, unit: 'gal',cost: 0 },
    { id: 'pcm2',  desc: 'Termiticide Treatment (Per Lin Ft)',       qty: 1, unit: 'lf', cost: 0 },
    { id: 'pcm3',  desc: 'Termite Bait Station',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'pcm4',  desc: 'Mosquito Spray Treatment (Per Visit)',      qty: 1, unit: 'ea', cost: 0 },
    { id: 'pcm5',  desc: 'Granular Bait (5lb)',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'pcm6',  desc: 'Glue Board / Snap Trap',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'pcm7',  desc: 'Wildlife Exclusion Mesh / Hardware',        qty: 1, unit: 'lot',cost: 0 },
    { id: 'pcm8',  desc: 'Heat Treatment (Bedbug, Per Room)',         qty: 1, unit: 'ea', cost: 0 },
    { id: 'pcm9',  desc: 'Misc Pest Supplies',                       qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'pce1', desc: 'Backpack / Compression Sprayer',     qty: 1, unit: 'day', rate: 0 },
    { id: 'pce2', desc: 'Dust Applicator (Bellows)',           qty: 1, unit: 'day', rate: 0 },
    { id: 'pce3', desc: 'Termite Drilling Set',                qty: 1, unit: 'day', rate: 0 },
    { id: 'pce4', desc: 'Mosquito Mister / ULV Fogger',        qty: 1, unit: 'day', rate: 0 },
    { id: 'pce5', desc: 'Heat Treatment Equipment',            qty: 1, unit: 'day', rate: 0 },
    { id: 'pce6', desc: 'Inspection Camera / Borescope',       qty: 1, unit: 'day', rate: 0 },
  ],
};
