// Tile — ceramic, porcelain, natural stone, mosaic; floors, walls, showers, backsplash.
// Reference: TCNA Handbook for Ceramic, Glass, and Stone Tile Installation (current ed),
// ANSI A108. Labor rate per BLS 47-2044 ($80/hr typical).

export default {
  color:            '#0d9488',
  stripe:           'linear-gradient(90deg, #0f766e, #14b8a6)',
  label:            'Tile',
  docLabel:         'Tile Installation Services',
  category:         'Construction',
  defaultLaborRate: 80,
  laborTitle:       'Tile Labor',
  licenseNote:      'Tile Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the tile work — material (ceramic, porcelain, stone, glass), location (floor, wall, shower, backsplash, fireplace), square footage, pattern (straight, diagonal, herringbone), waterproofing/moisture barrier, demolition of existing, and grout color.',
  matLibrary: [
    { id: 'tlm1',  desc: 'Porcelain Tile 12x24 (Sq Ft)',            qty: 1, unit: 'sf', cost: 0 },
    { id: 'tlm2',  desc: 'Ceramic Tile 12x12 (Sq Ft)',              qty: 1, unit: 'sf', cost: 0 },
    { id: 'tlm3',  desc: 'Natural Stone Tile (Sq Ft)',              qty: 1, unit: 'sf', cost: 0 },
    { id: 'tlm4',  desc: 'Mosaic Sheet 12x12',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'tlm5',  desc: 'Modified Thinset (50lb Bag)',              qty: 1, unit: 'bag',cost: 0 },
    { id: 'tlm6',  desc: 'Unmodified Thinset (50lb Bag)',            qty: 1, unit: 'bag',cost: 0 },
    { id: 'tlm7',  desc: 'Sanded Grout (25lb Bag)',                  qty: 1, unit: 'bag',cost: 0 },
    { id: 'tlm8',  desc: 'Unsanded Grout (10lb Bag)',                qty: 1, unit: 'bag',cost: 0 },
    { id: 'tlm9',  desc: 'Schluter Membrane / Kerdi (Roll)',         qty: 1, unit: 'roll',cost: 0 },
    { id: 'tlm10', desc: 'Cement Backer Board 3x5',                  qty: 1, unit: 'ea', cost: 0 },
    { id: 'tlm11', desc: 'Tile Spacers (Bag)',                       qty: 1, unit: 'bag',cost: 0 },
    { id: 'tlm12', desc: 'Schluter Edge Profile 8ft',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'tlm13', desc: 'Grout Sealer (Quart)',                     qty: 1, unit: 'qt', cost: 0 },
    { id: 'tlm14', desc: 'Misc Tile Supplies',                       qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'tle1', desc: 'Wet Saw 10" Diamond Blade',         qty: 1, unit: 'day', rate: 0 },
    { id: 'tle2', desc: 'Mortar Mixer / Paddle',              qty: 1, unit: 'day', rate: 0 },
    { id: 'tle3', desc: 'Tile Leveling System',               qty: 1, unit: 'day', rate: 0 },
    { id: 'tle4', desc: 'Tile Cutter Manual',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'tle5', desc: 'Grout Float / Sponges',              qty: 1, unit: 'day', rate: 0 },
    { id: 'tle6', desc: 'Floor Removal Tool / Demo Hammer',   qty: 1, unit: 'day', rate: 0 },
  ],
};
