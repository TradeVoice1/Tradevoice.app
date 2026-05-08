// Window Cleaning — residential, commercial high-rise, screens, gutters add-on, solar panels.
// Reference: IWCA Best Practices, OSHA fall protection for high-rise.
// Labor rate per BLS 37-2019 ($55/hr typical).

export default {
  color:            '#2563eb',
  stripe:           'linear-gradient(90deg, #1d4ed8, #60a5fa)',
  label:            'Window Cleaning',
  docLabel:         'Window Cleaning Services',
  category:         'Service',
  defaultLaborRate: 55,
  laborTitle:       'Window Cleaning Labor',
  licenseNote:      'IWCA-Certified Window Cleaner',
  scopePlaceholder: 'Describe the window-cleaning scope — interior, exterior, or both; pane count or rough sq ft of glass; screens cleaned & reinstalled; tracks/sills wiped; high-access (over 1 story) requirements; recurring contract terms.',
  matLibrary: [
    { id: 'wcm1', desc: 'Squeegee Rubber 18" (Each)',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'wcm2', desc: 'Microfiber Cloth (12-pack)',                qty: 1, unit: 'pk', cost: 0 },
    { id: 'wcm3', desc: 'Window Cleaning Solution (Gallon)',         qty: 1, unit: 'gal',cost: 0 },
    { id: 'wcm4', desc: 'Strip Washer Sleeve',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'wcm5', desc: 'Misc Window Supplies',                      qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'wce1', desc: 'Water-Fed Pole System (40ft)',       qty: 1, unit: 'day', rate: 0 },
    { id: 'wce2', desc: 'DI Water Tank / Filter',              qty: 1, unit: 'day', rate: 0 },
    { id: 'wce3', desc: 'Extension Ladder 28ft',               qty: 1, unit: 'day', rate: 0 },
    { id: 'wce4', desc: 'Boom / Scissor Lift',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'wce5', desc: 'Rope Access Gear (High-rise)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'wce6', desc: 'Bucket / Belt System',                qty: 1, unit: 'day', rate: 0 },
  ],
};
