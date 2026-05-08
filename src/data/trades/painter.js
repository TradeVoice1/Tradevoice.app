// Painter — interior, exterior, cabinet refinishing, prep work, faux finishes.
// Reference: PDCA Industry Standards (Painting & Decorating Contractors of America),
// MPI (Master Painters Institute) coating specs. Labor rate per BLS 47-2141 ($65/hr).

export default {
  color:            '#7c3aed',
  stripe:           'linear-gradient(90deg, #6d28d9, #a78bfa)',
  label:            'Painting',
  docLabel:         'Painting Services',
  category:         'Construction',
  defaultLaborRate: 65,
  laborTitle:       'Painting Labor',
  licenseNote:      'Licensed Painting Contractor',
  scopePlaceholder: 'Describe the painting work — rooms/areas, interior or exterior, prep level (light, full prep, repair-and-paint), number of coats, paint brand and finish (flat, eggshell, satin, semi-gloss). Note any caulk, patching, or wallpaper removal included.',
  matLibrary: [
    { id: 'pam1',  desc: 'Interior Latex Paint (Gallon)',          qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam2',  desc: 'Premium Interior Paint (Gallon)',         qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam3',  desc: 'Exterior Acrylic Paint (Gallon)',         qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam4',  desc: 'Primer / Sealer (Gallon)',                qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam5',  desc: 'Stain-Blocking Primer (Gallon)',          qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam6',  desc: 'Cabinet/Trim Enamel (Gallon)',            qty: 1, unit: 'gal', cost: 0 },
    { id: 'pam7',  desc: 'Drop Cloths 9x12 (Canvas)',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pam8',  desc: 'Painters Tape 1.88" (Roll)',              qty: 1, unit: 'roll',cost: 0 },
    { id: 'pam9',  desc: 'Caulk Paintable Latex (Tube)',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pam10', desc: 'Spackle Lightweight (Tub)',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pam11', desc: 'Sandpaper Assortment (Pack)',              qty: 1, unit: 'pk',  cost: 0 },
    { id: 'pam12', desc: 'Roller Cover Premium (Each)',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'pam13', desc: 'Brush Set (Misc)',                         qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'pae1', desc: 'Airless Paint Sprayer',           qty: 1, unit: 'day', rate: 0 },
    { id: 'pae2', desc: 'HVLP Sprayer (Cabinet/Trim)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'pae3', desc: 'Pressure Washer Rental',          qty: 1, unit: 'day', rate: 0 },
    { id: 'pae4', desc: 'Extension Ladder 28ft',           qty: 1, unit: 'day', rate: 0 },
    { id: 'pae5', desc: 'Scaffolding Set',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'pae6', desc: 'Drywall Sander (HEPA Vacuum)',    qty: 1, unit: 'day', rate: 0 },
  ],
};
