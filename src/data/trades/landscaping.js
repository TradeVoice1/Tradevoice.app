// Landscaping — design-build, hardscape, irrigation, planting, sod, mulch, drainage.
// Reference: NALP standards, ASIC irrigation standards, ICPI hardscape.
// Labor rate per BLS 37-3011 ($75/hr typical).

export default {
  color:            '#16a34a',
  stripe:           'linear-gradient(90deg, #15803d, #4ade80)',
  label:            'Landscaping',
  docLabel:         'Landscaping Services',
  category:         'Service',
  defaultLaborRate: 75,
  laborTitle:       'Landscaping Labor',
  licenseNote:      'Landscape Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the landscaping scope — design plan, hardscape (paver patio, retaining wall, walkway), planting (trees, shrubs, perennials), sod or seed, mulch, irrigation, lighting, drainage solutions. Note square footage and warranty/maintenance period.',
  matLibrary: [
    { id: 'lsm1',  desc: 'Concrete Paver 12x12 (Each)',             qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm2',  desc: 'Retaining Wall Block (Each)',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm3',  desc: 'Polymeric Sand 50lb',                      qty: 1, unit: 'bag',cost: 0 },
    { id: 'lsm4',  desc: 'Mulch Hardwood (Cu Yd)',                   qty: 1, unit: 'cy', cost: 0 },
    { id: 'lsm5',  desc: 'Topsoil Screened (Cu Yd)',                 qty: 1, unit: 'cy', cost: 0 },
    { id: 'lsm6',  desc: 'Sod (Per Sq Ft)',                          qty: 1, unit: 'sf', cost: 0 },
    { id: 'lsm7',  desc: 'Boxwood Shrub 3gal',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm8',  desc: '2-3" Caliper Tree',                        qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm9',  desc: 'Drip Irrigation Tubing 100ft',             qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm10', desc: 'Sprinkler Head Pop-Up Rotor',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm11', desc: 'Smart Irrigation Controller',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm12', desc: 'Edging Aluminum 8ft',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'lsm13', desc: 'Landscape Fabric (Roll)',                   qty: 1, unit: 'roll',cost: 0 },
    { id: 'lsm14', desc: 'Misc Landscape Supplies',                   qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'lse1', desc: 'Skid Steer w/ Bucket / Forks',       qty: 1, unit: 'day', rate: 0 },
    { id: 'lse2', desc: 'Mini-Excavator',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'lse3', desc: 'Plate Compactor',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'lse4', desc: 'Sod Cutter',                         qty: 1, unit: 'day', rate: 0 },
    { id: 'lse5', desc: 'Auger / Tree Spade',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'lse6', desc: 'Trencher (Walk-Behind)',              qty: 1, unit: 'day', rate: 0 },
  ],
};
