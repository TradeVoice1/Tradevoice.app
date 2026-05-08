// Waterproofing — exterior membranes, interior systems, French drains, crawl space
// encapsulation, sump pumps, foundation crack repair.
// Reference: NAWSRC standards, ACI 515.2R, IBC chapter 18.
// Labor rate per BLS 47-2061 ($85/hr typical).

export default {
  color:            '#0c4a6e',
  stripe:           'linear-gradient(90deg, #075985, #0284c7)',
  label:            'Waterproofing',
  docLabel:         'Waterproofing Services',
  category:         'Construction',
  defaultLaborRate: 85,
  laborTitle:       'Waterproofing Labor',
  licenseNote:      'Waterproofing Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the waterproofing scope — exterior membrane, interior drainage, French drain, sump pump installation, crawl space encapsulation, vapor barrier, dehumidifier, and any excavation/grading included. Note warranty terms.',
  matLibrary: [
    { id: 'wpm1',  desc: 'Bituminous Membrane (Sq Ft)',             qty: 1, unit: 'sf',  cost: 0 },
    { id: 'wpm2',  desc: 'Crystalline Waterproofing Coat (Bag)',     qty: 1, unit: 'bag', cost: 0 },
    { id: 'wpm3',  desc: 'Drainage Mat (Roll)',                      qty: 1, unit: 'roll',cost: 0 },
    { id: 'wpm4',  desc: 'Perforated Drain Pipe 4" (Per Lin Ft)',   qty: 1, unit: 'lf',  cost: 0 },
    { id: 'wpm5',  desc: 'Drain Stone / Gravel (Cu Yd)',             qty: 1, unit: 'cy',  cost: 0 },
    { id: 'wpm6',  desc: 'Filter Fabric (Roll)',                     qty: 1, unit: 'roll',cost: 0 },
    { id: 'wpm7',  desc: 'Sump Pump w/ Battery Backup',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm8',  desc: 'Crawl Space Vapor Barrier 12-mil (Roll)',  qty: 1, unit: 'roll',cost: 0 },
    { id: 'wpm9',  desc: 'Crawl Space Dehumidifier',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm10', desc: 'Crack Injection Polyurethane Kit',           qty: 1, unit: 'kit', cost: 0 },
    { id: 'wpm11', desc: 'Egress Window Well',                          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm12', desc: 'Misc Waterproofing Supplies',                 qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'wpe1', desc: 'Mini-Excavator',                      qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe2', desc: 'Concrete Saw',                        qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe3', desc: 'Demolition Hammer (Electric)',        qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe4', desc: 'Dump Trailer',                        qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe5', desc: 'Sprayer for Membrane',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe6', desc: 'Hydrostatic Test Pump',                qty: 1, unit: 'day', rate: 0 },
  ],
};
