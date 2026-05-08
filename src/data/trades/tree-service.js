// Tree Service — removal, pruning, stump grinding, emergency, cabling, plant health.
// Reference: ANSI A300 (tree care), ISA Best Management Practices, ANSI Z133 (safety).
// Labor rate per BLS 37-3013 ($95/hr typical, ISA-certified arborist).

export default {
  color:            '#166534',
  stripe:           'linear-gradient(90deg, #14532d, #22c55e)',
  label:            'Tree Service',
  docLabel:         'Tree Service',
  category:         'Service',
  defaultLaborRate: 95,
  laborTitle:       'Tree Service Labor',
  licenseNote:      'ISA-Certified Arborist',
  scopePlaceholder: 'Describe the tree scope — removal vs prune, tree height/DBH, location/access (proximity to structures, power lines), debris haul vs leave, stump grinding, ANSI A300 pruning specs, and any utility/permit coordination.',
  matLibrary: [
    { id: 'tsm1',  desc: 'Tree Removal Disposal (Per Cord)',        qty: 1, unit: 'cord',cost: 0 },
    { id: 'tsm2',  desc: 'Stump Grinding Disposal (Per Inch)',       qty: 1, unit: 'in', cost: 0 },
    { id: 'tsm3',  desc: 'Cabling/Bracing Hardware Set',              qty: 1, unit: 'set',cost: 0 },
    { id: 'tsm4',  desc: 'Wound Sealer / Pruning Paint',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'tsm5',  desc: 'Mulch (From Chipping, Per Cu Yd)',          qty: 1, unit: 'cy', cost: 0 },
    { id: 'tsm6',  desc: 'Insecticide Treatment (Per Tree)',          qty: 1, unit: 'ea', cost: 0 },
    { id: 'tsm7',  desc: 'Permit / Utility Notification Fee',         qty: 1, unit: 'ea', cost: 0 },
    { id: 'tsm8',  desc: 'Misc Tree Supplies',                        qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'tse1', desc: 'Bucket Truck (60ft)',                qty: 1, unit: 'day', rate: 0 },
    { id: 'tse2', desc: 'Stump Grinder (Towable)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'tse3', desc: 'Wood Chipper (12")',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'tse4', desc: 'Climbing / Rigging Gear Set',         qty: 1, unit: 'day', rate: 0 },
    { id: 'tse5', desc: 'Chainsaw Set (Climbing + Ground)',    qty: 1, unit: 'day', rate: 0 },
    { id: 'tse6', desc: 'Crane Operator (Removal)',            qty: 1, unit: 'day', rate: 0 },
  ],
};
