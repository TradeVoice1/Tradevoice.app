// Carpet Cleaning — hot water extraction, dry-extraction, stain & odor, upholstery.
// Reference: IICRC S100 (carpet cleaning standard), CRI Seal of Approval.
// Labor rate per BLS 37-2019 ($65/hr typical).

export default {
  color:            '#7c3aed',
  stripe:           'linear-gradient(90deg, #6d28d9, #a78bfa)',
  label:            'Carpet Cleaning',
  docLabel:         'Carpet Cleaning Services',
  category:         'Service',
  defaultLaborRate: 65,
  laborTitle:       'Carpet Cleaning Labor',
  licenseNote:      'IICRC-Certified Carpet Cleaner',
  scopePlaceholder: 'Describe the carpet cleaning scope — square footage / number of rooms, method (hot water extraction, dry-cleaning, encapsulation), pre-treatment for stains, deodorizing, upholstery cleaning, scotchgard / protector application, and dry time expectations.',
  matLibrary: [
    { id: 'ccm1', desc: 'Carpet Pre-Spray (Gallon)',                qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm2', desc: 'Spot/Stain Remover (Quart)',                qty: 1, unit: 'qt', cost: 0 },
    { id: 'ccm3', desc: 'Deodorizer (Quart)',                        qty: 1, unit: 'qt', cost: 0 },
    { id: 'ccm4', desc: 'Carpet Protector / Scotchgard (Gallon)',    qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm5', desc: 'Defoamer (Quart)',                          qty: 1, unit: 'qt', cost: 0 },
    { id: 'ccm6', desc: 'Misc Carpet Cleaning Supplies',             qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'cce1', desc: 'Truck-Mounted Extractor',            qty: 1, unit: 'day', rate: 0 },
    { id: 'cce2', desc: 'Portable Extractor',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'cce3', desc: 'Air Mover / Dryer',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'cce4', desc: 'Upholstery Wand / Tool',              qty: 1, unit: 'day', rate: 0 },
    { id: 'cce5', desc: 'Carpet Rake / Groomer',               qty: 1, unit: 'day', rate: 0 },
    { id: 'cce6', desc: 'CRB / Encapsulation Machine',         qty: 1, unit: 'day', rate: 0 },
  ],
};
