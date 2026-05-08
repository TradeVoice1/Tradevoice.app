// Specialty — catch-all for trades not yet broken out into their own sheet.
// Materials/equipment libraries lean general so any contractor can find them
// useful, but contractors who pick a more specific trade will get a better
// pre-loaded library.

export default {
  color:            '#16a34a',
  stripe:           'linear-gradient(90deg, #15803d, #22c55e)',
  label:            'Specialty Trades',
  docLabel:         'Specialty Trade Services',
  category:         'Construction',
  defaultLaborRate: 75,
  laborTitle:       'Labor',
  licenseNote:      'Licensed & Insured',
  scopePlaceholder: 'Describe the specialty work to be performed — specify the type of work (painting, flooring, drywall, tile, carpentry, landscaping, appliance repair, or other). List specific tasks, rooms or areas affected, materials included, and any prep or cleanup included in scope.',
  matLibrary: [
    { id: 'sm1',  desc: 'Drywall 4x8 Sheet 1/2"',                  qty: 1, unit: 'ea',  cost: 16.00 },
    { id: 'sm2',  desc: 'Drywall Compound (5 Gallon)',              qty: 1, unit: 'ea',  cost: 22.00 },
    { id: 'sm3',  desc: 'Interior Latex Paint (Gallon)',            qty: 1, unit: 'gal', cost: 38.00 },
    { id: 'sm4',  desc: 'Exterior Paint (Gallon)',                  qty: 1, unit: 'gal', cost: 45.00 },
    { id: 'sm5',  desc: 'Ceramic Floor Tile 12x12 (Sq Ft)',        qty: 1, unit: 'ea',  cost: 2.50  },
    { id: 'sm6',  desc: 'Tile Adhesive / Thin-Set (50lb Bag)',      qty: 1, unit: 'ea',  cost: 22.00 },
    { id: 'sm7',  desc: 'Laminate Flooring (Sq Ft)',               qty: 1, unit: 'ea',  cost: 2.20  },
    { id: 'sm8',  desc: 'LVP Flooring (Sq Ft)',                    qty: 1, unit: 'ea',  cost: 3.50  },
    { id: 'sm9',  desc: 'Carpet (Sq Yd)',                           qty: 1, unit: 'ea',  cost: 12.00 },
    { id: 'sm10', desc: 'Wood Trim / Baseboard 8ft',               qty: 1, unit: 'ea',  cost: 7.00  },
    { id: 'sm11', desc: 'Caulk Paintable Latex (Tube)',             qty: 1, unit: 'ea',  cost: 5.00  },
    { id: 'sm12', desc: 'Misc Supplies & Fasteners',               qty: 1, unit: 'lot', cost: 20.00 },
  ],
  equipLibrary: [
    { id: 'se1', desc: 'Pressure Washer Rental',            qty: 1, unit: 'day', rate: 85.00  },
    { id: 'se2', desc: 'Tile Saw Rental',                   qty: 1, unit: 'day', rate: 65.00  },
    { id: 'se3', desc: 'Floor Sander Rental',               qty: 1, unit: 'day', rate: 95.00  },
    { id: 'se4', desc: 'Rotary Hammer / Core Drill Rental', qty: 1, unit: 'day', rate: 55.00  },
    { id: 'se5', desc: 'Dumpster / Debris Haul',            qty: 1, unit: 'day', rate: 165.00 },
    { id: 'se6', desc: 'Paint Sprayer Rental',              qty: 1, unit: 'day', rate: 75.00  },
  ],
};
