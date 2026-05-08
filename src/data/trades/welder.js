// Welder — structural, ornamental iron, mobile repair, gates, railings, custom fab.
// Reference: AWS D1.1 (Structural Welding Code Steel), AWS D1.2 (Aluminum), AISC standards.
// Labor rate per BLS 51-4121 ($95/hr typical for certified welder).

export default {
  color:            '#27272a',
  stripe:           'linear-gradient(90deg, #18181b, #52525b)',
  label:            'Welder / Metal Fab',
  docLabel:         'Welding & Metal Fabrication',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Welder Labor',
  licenseNote:      'AWS-Certified Welder',
  scopePlaceholder: 'Describe the welding/fabrication scope — material (steel, stainless, aluminum), thickness, joint type, weld process (MIG, TIG, stick, flux-core), AWS code applicable, finish (paint, powder coat, raw), and any structural inspection or NDT required.',
  matLibrary: [
    { id: 'wlm1',  desc: 'A36 Steel Plate 1/4" (Per Sq Ft)',        qty: 1, unit: 'sf', cost: 0 },
    { id: 'wlm2',  desc: 'A500 Sq Tubing 2x2 (Per Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'wlm3',  desc: 'A500 Sq Tubing 4x4 (Per Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'wlm4',  desc: 'Stainless Tubing 304 (Per Lin Ft)',        qty: 1, unit: 'lf', cost: 0 },
    { id: 'wlm5',  desc: 'Aluminum Tubing 6061 (Per Lin Ft)',        qty: 1, unit: 'lf', cost: 0 },
    { id: 'wlm6',  desc: 'MIG Wire ER70S-6 (Spool)',                  qty: 1, unit: 'ea', cost: 0 },
    { id: 'wlm7',  desc: 'TIG Tungsten Electrode (Pack)',             qty: 1, unit: 'pk', cost: 0 },
    { id: 'wlm8',  desc: 'Stick Electrode 7018 (5lb)',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'wlm9',  desc: 'Argon / CO2 Gas (Tank, Per Day)',           qty: 1, unit: 'day',cost: 0 },
    { id: 'wlm10', desc: 'Cutting Wheel 4.5" (Each)',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'wlm11', desc: 'Weld-Through Primer (Aerosol)',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'wlm12', desc: 'Misc Hardware / Fasteners',                  qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'wle1', desc: 'MIG Welder (250A)',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'wle2', desc: 'TIG Welder (200A)',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'wle3', desc: 'Plasma Cutter',                      qty: 1, unit: 'day', rate: 0 },
    { id: 'wle4', desc: 'Angle Grinder Set',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'wle5', desc: 'Welding Table / Fixture',             qty: 1, unit: 'day', rate: 0 },
    { id: 'wle6', desc: 'Generator (Mobile Welding)',          qty: 1, unit: 'day', rate: 0 },
  ],
};
