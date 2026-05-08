// Cleaning (Residential) — recurring house cleaning, deep clean, move-in/out, post-construction.
// Reference: IICRC S100 (carpet) + general residential cleaning standards.
// Labor rate per BLS 37-2012 ($50/hr typical).

export default {
  color:            '#0ea5e9',
  stripe:           'linear-gradient(90deg, #0284c7, #38bdf8)',
  label:            'Cleaning (Residential)',
  docLabel:         'Residential Cleaning Services',
  category:         'Service',
  defaultLaborRate: 50,
  laborTitle:       'Cleaning Labor',
  licenseNote:      'Insured & Bonded',
  scopePlaceholder: 'Describe the cleaning scope — service type (recurring weekly/biweekly/monthly, deep clean, move-in/out, post-construction), home size (bedrooms, baths, sq ft), specific tasks (windows, oven, fridge), and supply provision (we bring or use yours).',
  matLibrary: [
    { id: 'clm1', desc: 'All-Purpose Cleaner (Gallon)',             qty: 1, unit: 'gal',cost: 0 },
    { id: 'clm2', desc: 'Disinfectant Spray (Each)',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'clm3', desc: 'Microfiber Cloth (12-pack)',                qty: 1, unit: 'pk', cost: 0 },
    { id: 'clm4', desc: 'Glass Cleaner (Gallon)',                    qty: 1, unit: 'gal',cost: 0 },
    { id: 'clm5', desc: 'Toilet Bowl Cleaner',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'clm6', desc: 'Trash Bags 13-Gal (Pack)',                 qty: 1, unit: 'pk', cost: 0 },
    { id: 'clm7', desc: 'Floor Cleaner Concentrate (Gal)',           qty: 1, unit: 'gal',cost: 0 },
    { id: 'clm8', desc: 'Misc Cleaning Supplies',                    qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'cle1', desc: 'HEPA Vacuum (Upright)',              qty: 1, unit: 'day', rate: 0 },
    { id: 'cle2', desc: 'Steam Cleaner (Hard Surfaces)',       qty: 1, unit: 'day', rate: 0 },
    { id: 'cle3', desc: 'Mop / Bucket Set',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'cle4', desc: 'Extension Duster',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'cle5', desc: 'Window Squeegee Kit',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'cle6', desc: 'Carpet Spotter',                      qty: 1, unit: 'day', rate: 0 },
  ],
};
