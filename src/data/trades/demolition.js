// Demolition — interior gut, full structure, selective demo, asbestos abatement coordination.
// Reference: OSHA 1926 Subpart T (Demolition), NDA Standards, EPA NESHAP for ACM.
// Labor rate per BLS 47-2061 ($85/hr typical).

export default {
  color:            '#7f1d1d',
  stripe:           'linear-gradient(90deg, #7f1d1d, #b91c1c)',
  label:            'Demolition',
  docLabel:         'Demolition Services',
  category:         'Construction',
  defaultLaborRate: 85,
  laborTitle:       'Demolition Labor',
  licenseNote:      'Demolition Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the demolition scope — interior gut, selective demo, full structure, square footage, debris hauling, dust containment, utility disconnects, asbestos/lead survey if pre-1980 building, permits and inspections required.',
  matLibrary: [
    { id: 'dmm1',  desc: '6-Mil Plastic Sheeting (Roll)',           qty: 1, unit: 'roll',cost: 0 },
    { id: 'dmm2',  desc: 'Dust Containment Tape',                    qty: 1, unit: 'roll',cost: 0 },
    { id: 'dmm3',  desc: 'Heavy-Duty Trash Bags (Box)',              qty: 1, unit: 'box', cost: 0 },
    { id: 'dmm4',  desc: 'Dumpster 30-Yard',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dmm5',  desc: 'Dumpster 40-Yard',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dmm6',  desc: 'Floor Protection Board (Per Sq Ft)',       qty: 1, unit: 'sf',  cost: 0 },
    { id: 'dmm7',  desc: 'Tyvek Suits (Each)',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dmm8',  desc: 'Respirators / Cartridges',                 qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dmm9',  desc: 'Permit Fees / Disposal Tickets',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'dmm10', desc: 'Misc Demolition Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'dme1', desc: 'Mini-Excavator',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'dme2', desc: 'Skid Steer + Bucket / Grapple',       qty: 1, unit: 'day', rate: 0 },
    { id: 'dme3', desc: 'Concrete Saw Walk-Behind',            qty: 1, unit: 'day', rate: 0 },
    { id: 'dme4', desc: 'Demolition Hammer 70lb',              qty: 1, unit: 'day', rate: 0 },
    { id: 'dme5', desc: 'Dump Trailer',                        qty: 1, unit: 'day', rate: 0 },
    { id: 'dme6', desc: 'Negative Air Machine',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'dme7', desc: 'Reciprocating Saw / Demo Tools',      qty: 1, unit: 'day', rate: 0 },
  ],
};
