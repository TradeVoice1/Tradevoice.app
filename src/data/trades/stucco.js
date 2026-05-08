// Stucco — three-coat traditional, one-coat synthetic, EIFS, repair, color coat.
// Reference: ASTM C926/C1063, EIMA EIFS Standards.
// Labor rate per BLS 47-2161 ($80/hr typical).

export default {
  color:            '#a16207',
  stripe:           'linear-gradient(90deg, #854d0e, #ca8a04)',
  label:            'Stucco / Plaster',
  docLabel:         'Stucco & Plaster Services',
  category:         'Construction',
  defaultLaborRate: 80,
  laborTitle:       'Stucco Labor',
  licenseNote:      'Stucco Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the stucco scope — system type (3-coat, 1-coat, EIFS), square footage, prep (wire lath, weather barrier, sheathing repair), color/finish texture (smooth, dash, lace, sand), and any caulking/sealant work. Note repair vs full re-coat.',
  matLibrary: [
    { id: 'stm1',  desc: 'Stucco Base Coat (Bag)',                  qty: 1, unit: 'bag',cost: 0 },
    { id: 'stm2',  desc: 'Stucco Brown Coat (Bag)',                 qty: 1, unit: 'bag',cost: 0 },
    { id: 'stm3',  desc: 'Stucco Color Coat / Finish (Bag)',         qty: 1, unit: 'bag',cost: 0 },
    { id: 'stm4',  desc: 'Stucco Wire Lath 27x96',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm5',  desc: 'Weather-Resistive Barrier (Roll)',         qty: 1, unit: 'roll',cost: 0 },
    { id: 'stm6',  desc: 'Casing Bead 10ft',                          qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm7',  desc: 'Weep Screed 10ft',                          qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm8',  desc: 'Control Joint 10ft',                        qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm9',  desc: 'EIFS Foam Board 4x8 1.5"',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm10', desc: 'Mesh Reinforcement (Roll)',                  qty: 1, unit: 'roll',cost: 0 },
    { id: 'stm11', desc: 'Acrylic Finish (5 Gal)',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'stm12', desc: 'Misc Stucco Supplies',                       qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'ste1', desc: 'Stucco Sprayer (Hopper)',           qty: 1, unit: 'day', rate: 0 },
    { id: 'ste2', desc: 'Mortar Mixer',                       qty: 1, unit: 'day', rate: 0 },
    { id: 'ste3', desc: 'Scaffolding Set',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'ste4', desc: 'Hawk & Trowel Set',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'ste5', desc: 'Air Compressor',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'ste6', desc: 'Pressure Washer (Prep)',             qty: 1, unit: 'day', rate: 0 },
  ],
};
