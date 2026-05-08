// Pressure Washing — house wash, driveways, decks, fences, soft-wash for shingles.
// Reference: PWNA standards (Power Washers of North America), SoftWash certification.
// Labor rate per BLS 37-3019 ($65/hr typical).

export default {
  color:            '#0891b2',
  stripe:           'linear-gradient(90deg, #0e7490, #06b6d4)',
  label:            'Pressure Washing',
  docLabel:         'Pressure Washing Services',
  category:         'Service',
  defaultLaborRate: 65,
  laborTitle:       'Pressure Washing Labor',
  licenseNote:      'Pressure Washing Contractor — Insured',
  scopePlaceholder: 'Describe the pressure washing scope — surface (house siding, driveway, deck, roof, concrete), square footage, soft-wash (shingles, painted) vs power-wash (concrete), surfactant/detergent, and post-treatment sealant if any.',
  matLibrary: [
    { id: 'pwm1', desc: 'House Wash Surfactant (Gal)',              qty: 1, unit: 'gal',cost: 0 },
    { id: 'pwm2', desc: 'Sodium Hypochlorite 12.5% (Gal)',          qty: 1, unit: 'gal',cost: 0 },
    { id: 'pwm3', desc: 'Concrete Cleaner (Gal)',                   qty: 1, unit: 'gal',cost: 0 },
    { id: 'pwm4', desc: 'Deck/Wood Brightener (Gal)',                qty: 1, unit: 'gal',cost: 0 },
    { id: 'pwm5', desc: 'Concrete Sealer (5 Gal)',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'pwm6', desc: 'Stain / Sealer Wood Deck (Gal)',            qty: 1, unit: 'gal',cost: 0 },
    { id: 'pwm7', desc: 'Misc Cleaning Supplies',                    qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'pwe1', desc: 'Pressure Washer 4000 PSI (Gas)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'pwe2', desc: 'Surface Cleaner Attachment',          qty: 1, unit: 'day', rate: 0 },
    { id: 'pwe3', desc: 'Soft-Wash Pump System',               qty: 1, unit: 'day', rate: 0 },
    { id: 'pwe4', desc: 'Telescoping Wand 24ft',               qty: 1, unit: 'day', rate: 0 },
    { id: 'pwe5', desc: 'Hot Water Pressure Washer',           qty: 1, unit: 'day', rate: 0 },
    { id: 'pwe6', desc: 'Sealer Sprayer',                      qty: 1, unit: 'day', rate: 0 },
  ],
};
