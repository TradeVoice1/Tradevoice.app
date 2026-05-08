// Mason — block, brick, stone veneer, chimneys, retaining walls, hardscape.
// Reference: TMS 402/602 (Building Code for Masonry), MIA Dimension Stone Standards.
// Labor rate per BLS 47-2021 ($90/hr typical).

export default {
  color:            '#78350f',
  stripe:           'linear-gradient(90deg, #78350f, #92400e)',
  label:            'Masonry',
  docLabel:         'Masonry Services',
  category:         'Construction',
  defaultLaborRate: 90,
  laborTitle:       'Masonry Labor',
  licenseNote:      'Licensed Masonry Contractor',
  scopePlaceholder: 'Describe the masonry work — brick veneer, block work, stone, chimney, fireplace, retaining wall, repointing, etc. Specify square footage or linear feet, mortar type (N/S/M), brick/block type, joint style (struck, raked, concave), and any structural connections.',
  matLibrary: [
    { id: 'mam1',  desc: 'Standard Modular Brick (Each)',           qty: 1, unit: 'ea',  cost: 0 },
    { id: 'mam2',  desc: '8x8x16 CMU Block (Each)',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'mam3',  desc: '12x8x16 CMU Block (Each)',                 qty: 1, unit: 'ea',  cost: 0 },
    { id: 'mam4',  desc: 'Type N Mortar Mix (70lb Bag)',             qty: 1, unit: 'bag', cost: 0 },
    { id: 'mam5',  desc: 'Type S Mortar Mix (70lb Bag)',             qty: 1, unit: 'bag', cost: 0 },
    { id: 'mam6',  desc: 'Portland Cement (94lb Bag)',               qty: 1, unit: 'bag', cost: 0 },
    { id: 'mam7',  desc: 'Mason Sand (Cu Yd)',                       qty: 1, unit: 'cy',  cost: 0 },
    { id: 'mam8',  desc: 'Stone Veneer (Sq Ft)',                     qty: 1, unit: 'sf',  cost: 0 },
    { id: 'mam9',  desc: 'Brick Ties (Box)',                         qty: 1, unit: 'box', cost: 0 },
    { id: 'mam10', desc: 'Wall Reinforcement Ladder (10ft)',          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'mam11', desc: 'Lintel Steel L-Angle (10ft)',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'mam12', desc: 'Flashing Membrane (Roll)',                  qty: 1, unit: 'roll',cost: 0 },
    { id: 'mam13', desc: 'Misc Masonry Supplies',                     qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'mae1', desc: 'Mortar Mixer (Towable)',            qty: 1, unit: 'day', rate: 0 },
    { id: 'mae2', desc: 'Brick Saw with Diamond Blade',       qty: 1, unit: 'day', rate: 0 },
    { id: 'mae3', desc: 'Mason Scaffolding Set',              qty: 1, unit: 'day', rate: 0 },
    { id: 'mae4', desc: 'Skid Steer Rental',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'mae5', desc: 'Tuckpointing Grinder',                qty: 1, unit: 'day', rate: 0 },
    { id: 'mae6', desc: 'Brick Tongs / Mason Hand Tools',      qty: 1, unit: 'day', rate: 0 },
  ],
};
