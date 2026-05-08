// Flooring — hardwood, LVP/LVT, laminate, carpet, vinyl, sheet goods, refinishing.
// Reference: NWFA Installation Guidelines (wood), CRI 104/105 (carpet), MFMA spec.
// Labor rate per BLS 47-2042 ($75/hr typical for installer).

export default {
  color:            '#92400e',
  stripe:           'linear-gradient(90deg, #92400e, #c2410c)',
  label:            'Flooring',
  docLabel:         'Flooring Services',
  category:         'Construction',
  defaultLaborRate: 75,
  laborTitle:       'Flooring Labor',
  licenseNote:      'Flooring Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the flooring work — material (hardwood, LVP, laminate, carpet, tile), square footage, rooms/areas, demolition of existing floor, subfloor prep / leveling, baseboard removal/reinstall, transition pieces, and finish work included.',
  matLibrary: [
    { id: 'flm1',  desc: 'Engineered Hardwood (Sq Ft)',             qty: 1, unit: 'sf', cost: 0 },
    { id: 'flm2',  desc: 'Solid Oak Hardwood 3/4" (Sq Ft)',         qty: 1, unit: 'sf', cost: 0 },
    { id: 'flm3',  desc: 'LVP Plank (Sq Ft)',                       qty: 1, unit: 'sf', cost: 0 },
    { id: 'flm4',  desc: 'Laminate Plank (Sq Ft)',                  qty: 1, unit: 'sf', cost: 0 },
    { id: 'flm5',  desc: 'Carpet (Sq Yd)',                          qty: 1, unit: 'sy', cost: 0 },
    { id: 'flm6',  desc: 'Carpet Pad 1/2" 8lb (Sq Yd)',             qty: 1, unit: 'sy', cost: 0 },
    { id: 'flm7',  desc: 'Underlayment Foam (Roll)',                qty: 1, unit: 'roll',cost: 0 },
    { id: 'flm8',  desc: 'Self-Leveling Compound (50lb Bag)',       qty: 1, unit: 'bag',cost: 0 },
    { id: 'flm9',  desc: 'Floor Adhesive (5 Gallon)',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'flm10', desc: 'T-Molding / Transition Strip',            qty: 1, unit: 'ea', cost: 0 },
    { id: 'flm11', desc: 'Quarter-Round / Shoe Moulding 8ft',        qty: 1, unit: 'ea', cost: 0 },
    { id: 'flm12', desc: 'Carpet Tack Strip 4ft',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'flm13', desc: 'Misc Flooring Supplies',                   qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'fle1', desc: 'Floor Sander Drum (Refinishing)',  qty: 1, unit: 'day', rate: 0 },
    { id: 'fle2', desc: 'Edger / Detail Sander',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fle3', desc: 'Carpet Power Stretcher',            qty: 1, unit: 'day', rate: 0 },
    { id: 'fle4', desc: 'Floor Roller (75lb)',               qty: 1, unit: 'day', rate: 0 },
    { id: 'fle5', desc: 'Tile Saw / Wet Saw',                qty: 1, unit: 'day', rate: 0 },
    { id: 'fle6', desc: 'Floor Removal Machine',             qty: 1, unit: 'day', rate: 0 },
  ],
};
