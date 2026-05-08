// Commercial Cleaning — janitorial contracts, post-construction, retail/office.
// Reference: ISSA Best Practices, OSHA bloodborne pathogen standards.
// Labor rate per BLS 37-2011 ($55/hr typical).

export default {
  color:            '#0284c7',
  stripe:           'linear-gradient(90deg, #075985, #0ea5e9)',
  label:            'Commercial Cleaning',
  docLabel:         'Commercial Cleaning Services',
  category:         'Service',
  defaultLaborRate: 55,
  laborTitle:       'Commercial Cleaning Labor',
  licenseNote:      'Insured & Bonded — ISSA Member',
  scopePlaceholder: 'Describe the commercial cleaning scope — facility type (office, retail, medical, industrial), square footage, frequency (daily, M-W-F, weekly), tasks (vacuum, mop, restrooms, trash, glass), supply provision, and any specialty services (floor refinishing, carpet shampoo).',
  matLibrary: [
    { id: 'ccm1', desc: 'Floor Stripper (Gallon)',                  qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm2', desc: 'Floor Finish Wax (Gallon)',                 qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm3', desc: 'Carpet Shampoo Concentrate (Gal)',          qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm4', desc: 'Restroom Disinfectant (Gallon)',            qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm5', desc: 'Trash Liners 33-Gal (Case)',                qty: 1, unit: 'cs', cost: 0 },
    { id: 'ccm6', desc: 'Paper Towels Multifold (Case)',             qty: 1, unit: 'cs', cost: 0 },
    { id: 'ccm7', desc: 'Toilet Paper 2-Ply (Case)',                  qty: 1, unit: 'cs', cost: 0 },
    { id: 'ccm8', desc: 'Hand Soap Foam (Gallon)',                    qty: 1, unit: 'gal',cost: 0 },
    { id: 'ccm9', desc: 'Misc Janitorial Supplies',                   qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'cce1', desc: 'Auto Scrubber (Walk-Behind)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'cce2', desc: 'Floor Buffer / Burnisher',            qty: 1, unit: 'day', rate: 0 },
    { id: 'cce3', desc: 'Backpack Vacuum HEPA',                qty: 1, unit: 'day', rate: 0 },
    { id: 'cce4', desc: 'Mop Bucket / Wringer Set',            qty: 1, unit: 'day', rate: 0 },
    { id: 'cce5', desc: 'Wet/Dry Vac',                         qty: 1, unit: 'day', rate: 0 },
    { id: 'cce6', desc: 'Carpet Extractor',                    qty: 1, unit: 'day', rate: 0 },
  ],
};
