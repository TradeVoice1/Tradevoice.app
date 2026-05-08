// Foundation Repair — pier installation (helical/push), wall anchors, slab repair,
// crack injection, basement waterproofing intersection, settlement remediation.
// Reference: ICC-ES AC358 (helical piers), ACI 562 (concrete repair).
// Labor rate per BLS 47-2061 ($115/hr typical for specialized contractor).

export default {
  color:            '#1e3a8a',
  stripe:           'linear-gradient(90deg, #1e40af, #3b82f6)',
  label:            'Foundation Repair',
  docLabel:         'Foundation Repair Services',
  category:         'Construction',
  defaultLaborRate: 115,
  laborTitle:       'Foundation Labor',
  licenseNote:      'Licensed Foundation Repair Specialist',
  scopePlaceholder: 'Describe the foundation scope — repair method (helical pier, push pier, wall anchors, carbon fiber, mudjack, polyurethane lift), number/location of piers, settlement amount, crack injection, drainage work, and structural engineer involvement.',
  matLibrary: [
    { id: 'fdm1',  desc: 'Helical Pier (Each)',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fdm2',  desc: 'Push / Resistance Pier (Each)',           qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fdm3',  desc: 'Wall Anchor Plate System',                qty: 1, unit: 'set', cost: 0 },
    { id: 'fdm4',  desc: 'Carbon Fiber Strap',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fdm5',  desc: 'Polyurethane Foam (Set)',                  qty: 1, unit: 'set', cost: 0 },
    { id: 'fdm6',  desc: 'Crack Injection Epoxy Kit',                qty: 1, unit: 'kit', cost: 0 },
    { id: 'fdm7',  desc: 'Sump Pump w/ Battery Backup',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fdm8',  desc: 'Interior Drain Tile (Per Lin Ft)',         qty: 1, unit: 'lf',  cost: 0 },
    { id: 'fdm9',  desc: 'Vapor Barrier (Crawl Space, Roll)',        qty: 1, unit: 'roll',cost: 0 },
    { id: 'fdm10', desc: 'Concrete Mix 60lb (Repair)',               qty: 1, unit: 'bag', cost: 0 },
    { id: 'fdm11', desc: 'Engineering Report / Stamp',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fdm12', desc: 'Misc Foundation Hardware',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'fde1', desc: 'Hydraulic Drive Head (Pier)',        qty: 1, unit: 'day', rate: 0 },
    { id: 'fde2', desc: 'Mini-Excavator (Access)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fde3', desc: 'Concrete Saw / Demo Tools',           qty: 1, unit: 'day', rate: 0 },
    { id: 'fde4', desc: 'Slab Lifting Pump (Polyurethane)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'fde5', desc: 'Laser Level / Manometer',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fde6', desc: 'Pump Truck for Concrete',             qty: 1, unit: 'day', rate: 0 },
  ],
};
