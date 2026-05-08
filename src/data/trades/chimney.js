// Chimney Sweep — inspection, cleaning, cap replacement, liner install, masonry repair.
// Reference: NFPA 211, CSIA Best Practices, NFI certification.
// Labor rate per BLS 47-4099 ($95/hr typical, CSIA-certified).

export default {
  color:            '#52525b',
  stripe:           'linear-gradient(90deg, #3f3f46, #71717a)',
  label:            'Chimney Sweep',
  docLabel:         'Chimney Services',
  category:         'Service',
  defaultLaborRate: 95,
  laborTitle:       'Chimney Labor',
  licenseNote:      'CSIA-Certified Chimney Sweep',
  scopePlaceholder: 'Describe the chimney scope — Level 1/2/3 inspection, cleaning, cap install, liner replacement (stainless), tuckpointing, crown repair, waterproofing. Note appliance type (wood, gas, pellet) and any code/insurance documentation provided.',
  matLibrary: [
    { id: 'chm1', desc: 'Stainless Steel Liner 6" (Per Foot)',      qty: 1, unit: 'ft', cost: 0 },
    { id: 'chm2', desc: 'Chimney Cap Stainless',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'chm3', desc: 'Chase Cover Custom',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'chm4', desc: 'Chimney Crown Sealer (Quart)',              qty: 1, unit: 'qt', cost: 0 },
    { id: 'chm5', desc: 'Waterproofing Sealant (Gallon)',            qty: 1, unit: 'gal',cost: 0 },
    { id: 'chm6', desc: 'Tuckpoint Mortar (Bag)',                    qty: 1, unit: 'bag',cost: 0 },
    { id: 'chm7', desc: 'Smoke Chamber Parge Material',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'chm8', desc: 'Damper / Top-Sealing Damper',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'chm9', desc: 'Misc Chimney Hardware',                     qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'che1', desc: 'Power Sweep Set (Rotary)',           qty: 1, unit: 'day', rate: 0 },
    { id: 'che2', desc: 'Chimney Camera (Inspection)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'che3', desc: 'HEPA Vacuum',                         qty: 1, unit: 'day', rate: 0 },
    { id: 'che4', desc: 'Roof Ladder / Hooks',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'che5', desc: 'Safety Harness Kit',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'che6', desc: 'Tuckpointing Grinder',                qty: 1, unit: 'day', rate: 0 },
  ],
};
