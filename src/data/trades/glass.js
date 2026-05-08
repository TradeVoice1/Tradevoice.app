// Glass / Glazier — windows, sliding doors, shower enclosures, mirrors, storefronts.
// Reference: AAMA/WDMA/CSA 101/I.S.2/A440 (window/door performance), GANA Glazing Manual.
// Labor rate per BLS 47-2121 ($80/hr typical).

export default {
  color:            '#0ea5e9',
  stripe:           'linear-gradient(90deg, #0284c7, #38bdf8)',
  label:            'Glass / Window',
  docLabel:         'Glass & Window Services',
  category:         'Construction',
  defaultLaborRate: 80,
  laborTitle:       'Glass / Window Labor',
  licenseNote:      'Glazier — Licensed & Insured',
  scopePlaceholder: 'Describe the glass/window scope — replacement vs new construction, units (each), glass type (single/double/triple, Low-E, tempered, laminated), frame material (vinyl, aluminum, fiberglass, wood), permits, U-factor/SHGC requirements, and demo/disposal of existing.',
  matLibrary: [
    { id: 'glm1',  desc: 'Vinyl Window Double-Hung 36x60',          qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm2',  desc: 'Vinyl Casement Window 24x48',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm3',  desc: 'Sliding Glass Door 6ft',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm4',  desc: 'Tempered Glass Panel (Per Sq Ft)',         qty: 1, unit: 'sf', cost: 0 },
    { id: 'glm5',  desc: 'Low-E Insulated Glass Unit (Per Sq Ft)',  qty: 1, unit: 'sf', cost: 0 },
    { id: 'glm6',  desc: 'Frameless Shower Enclosure 60"',           qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm7',  desc: 'Mirror Polished Edge (Per Sq Ft)',         qty: 1, unit: 'sf', cost: 0 },
    { id: 'glm8',  desc: 'Patio Door Screen',                        qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm9',  desc: 'Window Flashing Tape (Roll)',               qty: 1, unit: 'roll',cost: 0 },
    { id: 'glm10', desc: 'Silicone Sealant (Tube)',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm11', desc: 'Spray Foam Window/Door (Can)',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'glm12', desc: 'Misc Glass Hardware',                       qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'gle1', desc: 'Glass Suction Cups (Set)',           qty: 1, unit: 'day', rate: 0 },
    { id: 'gle2', desc: 'Glass Cutter (Score & Snap)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'gle3', desc: 'Caulking Gun / Sealant Tools',        qty: 1, unit: 'day', rate: 0 },
    { id: 'gle4', desc: 'Glass Lift / Manipulator',            qty: 1, unit: 'day', rate: 0 },
    { id: 'gle5', desc: 'Reciprocating Saw (Removal)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'gle6', desc: 'Window Lift / Hoist',                 qty: 1, unit: 'day', rate: 0 },
  ],
};
