// Pool / Spa — installation, equipment service, opening/closing, plaster, vinyl liner.
// Reference: APSP/ANSI standards, IPMC pool barrier code, NSF 50.
// Labor rate per BLS 47-1011 ($95/hr typical).

export default {
  color:            '#0891b2',
  stripe:           'linear-gradient(90deg, #06b6d4, #67e8f9)',
  label:            'Pool / Spa',
  docLabel:         'Pool & Spa Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Pool / Spa Labor',
  licenseNote:      'Licensed Pool / Spa Contractor',
  scopePlaceholder: 'Describe the pool/spa scope — new install (gunite, vinyl, fiberglass), equipment service (pump, filter, heater, salt cell), liner replacement, plaster/coping repair, opening/closing, water testing & balancing, automation, safety barriers/code compliance.',
  matLibrary: [
    { id: 'pom1',  desc: 'Pool Pump 1.5HP Variable Speed',          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom2',  desc: 'Pool Filter Cartridge',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom3',  desc: 'Sand Filter (24")',                        qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom4',  desc: 'Pool Heater Gas (250k BTU)',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom5',  desc: 'Salt Cell Generator',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom6',  desc: 'Vinyl Liner (16x32)',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom7',  desc: 'Robotic Pool Cleaner',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom8',  desc: 'Pool Cover Solar (Per Sq Ft)',             qty: 1, unit: 'sf',  cost: 0 },
    { id: 'pom9',  desc: 'PVC Plumbing Set (Replumb)',               qty: 1, unit: 'lot', cost: 0 },
    { id: 'pom10', desc: 'Pool Chemicals Opening Kit',                qty: 1, unit: 'kit', cost: 0 },
    { id: 'pom11', desc: 'Pool Light LED w/ Niche',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pom12', desc: 'Misc Pool Equipment / Hardware',            qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'poe1', desc: 'Pump Truck (Pool Drain)',            qty: 1, unit: 'day', rate: 0 },
    { id: 'poe2', desc: 'Pool Vacuum / Cleaner',               qty: 1, unit: 'day', rate: 0 },
    { id: 'poe3', desc: 'Pool Test Kit / Digital Tester',      qty: 1, unit: 'day', rate: 0 },
    { id: 'poe4', desc: 'Plastering Hawk & Trowel Set',        qty: 1, unit: 'day', rate: 0 },
    { id: 'poe5', desc: 'Pressure Test Equipment',             qty: 1, unit: 'day', rate: 0 },
    { id: 'poe6', desc: 'Wet/Dry Shop Vac',                    qty: 1, unit: 'day', rate: 0 },
  ],
};
