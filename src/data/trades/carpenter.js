// Carpenter — rough framing, finish carpentry, trim, doors, custom millwork.
// Reference: International Residential Code (IRC) chapters 5-8, AWI Quality Standards
// for finish carpentry. Labor rate per BLS 47-2031 ($90/hr typical for licensed carpenter).
// Material/equipment prices left BLANK — fill in your local supplier prices.

export default {
  color:            '#92400e',
  stripe:           'linear-gradient(90deg, #78350f, #b45309)',
  label:            'Carpentry',
  docLabel:         'Carpentry Services',
  category:         'Construction',
  defaultLaborRate: 90,
  laborTitle:       'Carpentry Labor',
  licenseNote:      'Licensed Carpenter',
  scopePlaceholder: 'Describe the carpentry work — framing, finish trim, door installation, custom built-ins, cabinet hanging, stair work, deck/porch framing, etc. Specify lumber grade and species, painted vs stained finish, and any structural inspections required.',
  matLibrary: [
    { id: 'cm1',  desc: '2x4x8 Stud (KD-19 SPF)',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm2',  desc: '2x6x8 (KD-19 SPF)',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm3',  desc: '2x8x10 (#2 SYP)',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm4',  desc: '2x10x12 (#2 SYP)',                        qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm5',  desc: '7/16" OSB Sheathing (4x8 sheet)',         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm6',  desc: '3/4" CDX Plywood (4x8 sheet)',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm7',  desc: 'Pine Baseboard 8ft',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm8',  desc: 'MDF Crown Moulding 8ft',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm9',  desc: 'Interior Door Slab 30"',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm10', desc: 'Pre-Hung Interior Door Unit',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm11', desc: 'Exterior Pre-Hung Door (Steel)',           qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm12', desc: 'Construction Adhesive (Tube)',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'cm13', desc: '16d Framing Nails (50lb Box)',             qty: 1, unit: 'box', cost: 0 },
    { id: 'cm14', desc: 'Finish Nails 2-1/2" (5lb Box)',            qty: 1, unit: 'box', cost: 0 },
    { id: 'cm15', desc: 'Wood Screws (Assorted Box)',               qty: 1, unit: 'box', cost: 0 },
    { id: 'cm16', desc: 'Misc Carpentry Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'ce1', desc: 'Miter Saw / Stand',                qty: 1, unit: 'day', rate: 0 },
    { id: 'ce2', desc: 'Table Saw (Job-site)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'ce3', desc: 'Framing Nail Gun + Compressor',    qty: 1, unit: 'day', rate: 0 },
    { id: 'ce4', desc: 'Finish Nailer',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'ce5', desc: 'Track Saw / Plunge Saw Rental',    qty: 1, unit: 'day', rate: 0 },
    { id: 'ce6', desc: 'Scaffolding Set Rental',           qty: 1, unit: 'day', rate: 0 },
  ],
};
