// Gutter Cleaning — debris removal, downspout flush, minor repair, maintenance plans.
// Reference: ARMA gutter maintenance guidelines, OSHA fall protection.
// Labor rate per BLS 37-3019 ($55/hr typical).

export default {
  color:            '#0e7490',
  stripe:           'linear-gradient(90deg, #155e75, #22d3ee)',
  label:            'Gutter Cleaning',
  docLabel:         'Gutter Cleaning Services',
  category:         'Service',
  defaultLaborRate: 55,
  laborTitle:       'Gutter Cleaning Labor',
  licenseNote:      'Insured Gutter Cleaning Service',
  scopePlaceholder: 'Describe the gutter cleaning scope — single vs multi-story, linear feet of gutter, debris removal, downspout flush, minor sealing/screw replacement, gutter guard installation, recurring contract terms (semi-annual, quarterly).',
  matLibrary: [
    { id: 'gcm1', desc: 'Sealant / Caulk Tube',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'gcm2', desc: 'Gutter Screws (Box)',                       qty: 1, unit: 'box',cost: 0 },
    { id: 'gcm3', desc: 'Gutter Guard 5" (Per Lin Ft)',              qty: 1, unit: 'lf', cost: 0 },
    { id: 'gcm4', desc: 'Disposal Bags',                             qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'gce1', desc: 'Gutter Vacuum System',               qty: 1, unit: 'day', rate: 0 },
    { id: 'gce2', desc: 'Extension Ladder 28ft',               qty: 1, unit: 'day', rate: 0 },
    { id: 'gce3', desc: 'Pressure Washer (Downspout Flush)',   qty: 1, unit: 'day', rate: 0 },
    { id: 'gce4', desc: 'Leaf Blower / Air Compressor',        qty: 1, unit: 'day', rate: 0 },
    { id: 'gce5', desc: 'Safety Harness Kit',                  qty: 1, unit: 'day', rate: 0 },
  ],
};
