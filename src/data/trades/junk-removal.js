// Junk Removal — full-service hauling, estate cleanouts, demolition support, donation runs.
// Reference: NWRA standards, state hauler license requirements.
// Labor rate per BLS 53-7081 ($95/hr typical for crew + truck).

export default {
  color:            '#a16207',
  stripe:           'linear-gradient(90deg, #92400e, #ca8a04)',
  label:            'Junk Removal',
  docLabel:         'Junk Removal Services',
  category:         'Service',
  defaultLaborRate: 95,
  laborTitle:       'Junk Removal Labor',
  licenseNote:      'Licensed Hauler — Insured',
  scopePlaceholder: 'Describe the junk removal scope — volume (1/4 truck, 1/2 truck, full truck, multi-truck), item types (general, construction debris, e-waste, hazmat), donation runs, recycling vs landfill, and dump fees included.',
  matLibrary: [
    { id: 'jrm1', desc: 'Dump Fee (Per Ton)',                       qty: 1, unit: 'ton',cost: 0 },
    { id: 'jrm2', desc: 'E-Waste Disposal Fee',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'jrm3', desc: 'Mattress Disposal Fee',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'jrm4', desc: 'Hazmat / Paint Disposal Fee',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'jrm5', desc: 'Misc Disposal Fees',                         qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'jre1', desc: 'Dump Truck (10-Yard)',               qty: 1, unit: 'day', rate: 0 },
    { id: 'jre2', desc: 'Dump Trailer 14ft',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'jre3', desc: 'Hand Truck / Dolly Set',              qty: 1, unit: 'day', rate: 0 },
    { id: 'jre4', desc: 'Lifting Straps / Moving Blankets',    qty: 1, unit: 'day', rate: 0 },
    { id: 'jre5', desc: 'Skid Steer (Heavy Loads)',             qty: 1, unit: 'day', rate: 0 },
  ],
};
