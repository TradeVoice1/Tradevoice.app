// Roofer — shingle, metal, TPO, EPDM, flashing, gutters, repairs, full re-roof.
// Reference: NRCA Roofing Manual (current ed), GAF/Owens Corning installation specs.
// Labor rate per BLS 47-2181 ($85/hr typical).

export default {
  color:            '#b45309',
  stripe:           'linear-gradient(90deg, #92400e, #d97706)',
  label:            'Roofing',
  docLabel:         'Roofing Services',
  category:         'Construction',
  defaultLaborRate: 85,
  laborTitle:       'Roofing Labor',
  licenseNote:      'Licensed Roofing Contractor',
  scopePlaceholder: 'Describe the roofing work to be performed — full replacement, repair, re-roof, flashing, gutters, skylights, etc. Specify material type (architectural shingle, metal, TPO, etc.), square footage, and any structural concerns noted during inspection.',
  matLibrary: [
    { id: 'rm1',  desc: 'Architectural Shingles (Square)',          qty: 1, unit: 'ea',  cost: 110.00 },
    { id: 'rm2',  desc: '3-Tab Shingles (Square)',                  qty: 1, unit: 'ea',  cost: 75.00  },
    { id: 'rm3',  desc: 'Ice & Water Shield (Square)',              qty: 1, unit: 'ea',  cost: 95.00  },
    { id: 'rm4',  desc: 'Synthetic Felt Underlayment (Roll)',       qty: 1, unit: 'roll',cost: 38.00  },
    { id: 'rm5',  desc: 'Ridge Cap Shingles (Bundle)',              qty: 1, unit: 'ea',  cost: 55.00  },
    { id: 'rm6',  desc: 'Drip Edge Aluminum 10ft',                  qty: 1, unit: 'ea',  cost: 9.00   },
    { id: 'rm7',  desc: 'Step Flashing (Bundle of 10)',             qty: 1, unit: 'ea',  cost: 22.00  },
    { id: 'rm8',  desc: 'Valley Flashing 10ft',                     qty: 1, unit: 'ea',  cost: 14.00  },
    { id: 'rm9',  desc: 'Roof Deck Nails 1-3/4" (5lb Box)',        qty: 1, unit: 'box', cost: 18.00  },
    { id: 'rm10', desc: 'Roofing Coil Nails (Coil of 120)',        qty: 1, unit: 'ea',  cost: 12.00  },
    { id: 'rm11', desc: 'Roof Cement / Flashing Sealant (Tube)',    qty: 1, unit: 'ea',  cost: 9.00   },
    { id: 'rm12', desc: 'OSB Sheathing 7/16" (Sheet)',              qty: 1, unit: 'ea',  cost: 28.00  },
    { id: 'rm13', desc: 'Aluminum Gutter 10ft Section',             qty: 1, unit: 'ea',  cost: 14.00  },
    { id: 'rm14', desc: 'Downspout Aluminum 10ft',                  qty: 1, unit: 'ea',  cost: 10.00  },
    { id: 'rm15', desc: 'Misc Roofing Supplies & Fasteners',        qty: 1, unit: 'lot', cost: 35.00  },
  ],
  equipLibrary: [
    { id: 're1', desc: 'Roofing Nail Gun (Coil)',           qty: 1, unit: 'day', rate: 55.00  },
    { id: 're2', desc: 'Air Compressor Rental',             qty: 1, unit: 'day', rate: 45.00  },
    { id: 're3', desc: 'Roofing Tear-Off Shovel & Tools',   qty: 1, unit: 'day', rate: 25.00  },
    { id: 're4', desc: 'Dump Trailer / Debris Haul',        qty: 1, unit: 'day', rate: 175.00 },
    { id: 're5', desc: 'Aerial Lift / Boom Lift Rental',    qty: 1, unit: 'day', rate: 265.00 },
    { id: 're6', desc: 'Safety Harness & Fall Protection',  qty: 1, unit: 'day', rate: 20.00  },
  ],
};
