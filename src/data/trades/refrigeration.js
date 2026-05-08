// Refrigeration — commercial refrigeration, walk-ins, ice machines, refrigerated cases.
// Reference: ASHRAE Refrigeration Handbook, EPA 608 Type II/Universal cert, IIAR (ammonia).
// Labor rate per BLS 49-9021 ($115/hr typical, specialized HVAC subset).

export default {
  color:            '#0e7490',
  stripe:           'linear-gradient(90deg, #155e75, #06b6d4)',
  label:            'Refrigeration',
  docLabel:         'Refrigeration Services',
  category:         'Construction',
  defaultLaborRate: 115,
  laborTitle:       'Refrigeration Labor',
  licenseNote:      'EPA 608 Universal — Certified Refrigeration Tech',
  scopePlaceholder: 'Describe the refrigeration scope — equipment type (walk-in, ice machine, reach-in, display case, beverage cooler), repair vs replace, refrigerant type and charge weight, control or compressor service, and any FDA/health-dept downtime considerations.',
  matLibrary: [
    { id: 'rfm1',  desc: 'R-404A Refrigerant (lb)',                 qty: 1, unit: 'lb', cost: 0 },
    { id: 'rfm2',  desc: 'R-448A Refrigerant (lb)',                  qty: 1, unit: 'lb', cost: 0 },
    { id: 'rfm3',  desc: 'Compressor Replacement (Mid-Size)',        qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm4',  desc: 'Evaporator Coil Reach-In',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm5',  desc: 'Condenser Fan Motor',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm6',  desc: 'TXV / Thermostatic Valve',                  qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm7',  desc: 'Defrost Heater Element',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm8',  desc: 'Door Gasket (Per Lin Ft)',                 qty: 1, unit: 'lf', cost: 0 },
    { id: 'rfm9',  desc: 'Ice Machine Water Filter',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm10', desc: 'Drier / Filter Drier',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm11', desc: 'Refrigerant Line Set (Pre-Charged)',        qty: 1, unit: 'ea', cost: 0 },
    { id: 'rfm12', desc: 'Misc Refrigeration Parts',                  qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'rfe1', desc: 'Refrigerant Recovery Machine',       qty: 1, unit: 'day', rate: 0 },
    { id: 'rfe2', desc: 'Vacuum Pump (Deep)',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'rfe3', desc: 'Manifold Gauge Set',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'rfe4', desc: 'Brazing Torch / Acetylene Kit',       qty: 1, unit: 'day', rate: 0 },
    { id: 'rfe5', desc: 'Refrigerant Scale (Digital)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'rfe6', desc: 'Leak Detector (Electronic)',          qty: 1, unit: 'day', rate: 0 },
  ],
};
