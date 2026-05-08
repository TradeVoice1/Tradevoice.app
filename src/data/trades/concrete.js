// Concrete — flatwork, footings, slabs, driveways, sidewalks, foundations, decorative.
// Reference: ACI 301/318 (Specifications/Building Code), ASTM C94 (ready-mix), ACI 332 (residential).
// Labor rate per BLS 47-2051 ($85/hr typical).

export default {
  color:            '#475569',
  stripe:           'linear-gradient(90deg, #334155, #64748b)',
  label:            'Concrete',
  docLabel:         'Concrete Services',
  category:         'Construction',
  defaultLaborRate: 85,
  laborTitle:       'Concrete Labor',
  licenseNote:      'Concrete Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the concrete work — slab, footing, driveway, sidewalk, patio, foundation, decorative/stamped, etc. Note square footage or cubic yards, PSI strength, reinforcement (rebar, mesh, fiber), finish (broom, smooth, exposed aggregate), and excavation/forming included.',
  matLibrary: [
    { id: 'conm1',  desc: 'Ready-Mix Concrete 3500 PSI (Cu Yd)',    qty: 1, unit: 'cy',  cost: 0 },
    { id: 'conm2',  desc: 'Ready-Mix Concrete 4000 PSI (Cu Yd)',    qty: 1, unit: 'cy',  cost: 0 },
    { id: 'conm3',  desc: 'Bagged Concrete 60lb',                    qty: 1, unit: 'bag', cost: 0 },
    { id: 'conm4',  desc: '#4 Rebar 20ft Stick',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm5',  desc: '#5 Rebar 20ft Stick',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm6',  desc: 'WWF Wire Mesh (5x10 Sheet)',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm7',  desc: '6-Mil Vapor Barrier (10x100 Roll)',        qty: 1, unit: 'roll',cost: 0 },
    { id: 'conm8',  desc: '2x4 Form Lumber 10ft',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm9',  desc: 'Form Stakes (Steel, 24")',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm10', desc: 'Expansion Joint Material 4ft',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm11', desc: 'Concrete Sealer (5 Gallon)',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm12', desc: 'Curing Compound (5 Gallon)',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'conm13', desc: 'Crushed Stone Base (Cu Yd)',              qty: 1, unit: 'cy',  cost: 0 },
    { id: 'conm14', desc: 'Misc Concrete Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'cone1', desc: 'Concrete Mixer 9 Cu Ft Rental',     qty: 1, unit: 'day', rate: 0 },
    { id: 'cone2', desc: 'Power Trowel Rental',                qty: 1, unit: 'day', rate: 0 },
    { id: 'cone3', desc: 'Bull Float / Hand Float Set',        qty: 1, unit: 'day', rate: 0 },
    { id: 'cone4', desc: 'Plate Compactor Rental',             qty: 1, unit: 'day', rate: 0 },
    { id: 'cone5', desc: 'Concrete Saw Walk-Behind',           qty: 1, unit: 'day', rate: 0 },
    { id: 'cone6', desc: 'Skid Steer Rental',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'cone7', desc: 'Concrete Pump Truck (Boom)',         qty: 1, unit: 'day', rate: 0 },
  ],
};
