// Garage Door — installation, replacement, opener service, spring/cable/track repair.
// Reference: DASMA standards (Door & Access Systems Manufacturers), UL 325.
// Labor rate per BLS 49-9012 ($95/hr typical for technician).

export default {
  color:            '#374151',
  stripe:           'linear-gradient(90deg, #1f2937, #6b7280)',
  label:            'Garage Door',
  docLabel:         'Garage Door Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Garage Door Labor',
  licenseNote:      'Garage Door Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the garage door scope — door size and style (sectional, carriage), R-value/insulation, opener (chain, belt, screw drive, jackshaft, smart), springs (torsion, extension), tracks, hardware, weatherseal, opener accessories (battery backup, keypad, remote).',
  matLibrary: [
    { id: 'gdm1',  desc: '16x7 Insulated Sectional Door',           qty: 1, unit: 'ea',  cost: 0 },
    { id: 'gdm2',  desc: '9x7 Insulated Sectional Door',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'gdm3',  desc: 'Carriage-House Style 16x7',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'gdm4',  desc: 'Belt-Drive Opener 1HP',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'gdm5',  desc: 'Smart WiFi Opener',                        qty: 1, unit: 'ea',  cost: 0 },
    { id: 'gdm6',  desc: 'Torsion Spring (Per Pair)',                 qty: 1, unit: 'pr', cost: 0 },
    { id: 'gdm7',  desc: 'Garage Door Cables (Pair)',                qty: 1, unit: 'pr', cost: 0 },
    { id: 'gdm8',  desc: 'Roller Set (10-pack)',                      qty: 1, unit: 'pk', cost: 0 },
    { id: 'gdm9',  desc: 'Track Set (Vertical + Horizontal)',         qty: 1, unit: 'set',cost: 0 },
    { id: 'gdm10', desc: 'Bottom Weatherseal (Lin Ft)',               qty: 1, unit: 'lf', cost: 0 },
    { id: 'gdm11', desc: 'Side / Top Weatherseal (Lin Ft)',           qty: 1, unit: 'lf', cost: 0 },
    { id: 'gdm12', desc: 'Wall Console / Keypad / Remote',            qty: 1, unit: 'ea', cost: 0 },
    { id: 'gdm13', desc: 'Misc Hardware / Lubricants',                qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'gde1', desc: 'Winding Bar Set (Torsion Spring)',  qty: 1, unit: 'day', rate: 0 },
    { id: 'gde2', desc: 'Door Lift / Suction Cup',            qty: 1, unit: 'day', rate: 0 },
    { id: 'gde3', desc: 'Cordless Impact Driver',             qty: 1, unit: 'day', rate: 0 },
    { id: 'gde4', desc: 'Step Ladder 8ft',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'gde5', desc: 'Cordless Drill / Impact',            qty: 1, unit: 'day', rate: 0 },
    { id: 'gde6', desc: 'Force Test / Reverse Test Tool',     qty: 1, unit: 'day', rate: 0 },
  ],
};
