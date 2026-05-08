// Asphalt / Paving — driveways, parking lots, sealcoating, repair, striping.
// Reference: NAPA Asphalt Pavement Construction guides, ASTM D6927 (Marshall Mix).
// Labor rate per BLS 47-2071 ($90/hr typical).

export default {
  color:            '#1c1917',
  stripe:           'linear-gradient(90deg, #0c0a09, #44403c)',
  label:            'Asphalt / Paving',
  docLabel:         'Asphalt & Paving Services',
  category:         'Construction',
  defaultLaborRate: 90,
  laborTitle:       'Paving Labor',
  licenseNote:      'Licensed Paving Contractor',
  scopePlaceholder: 'Describe the asphalt scope — new driveway, parking lot, overlay, sealcoat, crack fill, patch, striping. Note square footage, asphalt thickness (typically 2-4"), base prep, edge treatment, and warranty.',
  matLibrary: [
    { id: 'apm1',  desc: 'Hot-Mix Asphalt 9.5mm (Per Ton)',         qty: 1, unit: 'ton',cost: 0 },
    { id: 'apm2',  desc: 'Crushed Stone Base #57 (Cu Yd)',           qty: 1, unit: 'cy', cost: 0 },
    { id: 'apm3',  desc: 'Tack Coat (Per Sq Yd)',                    qty: 1, unit: 'sy', cost: 0 },
    { id: 'apm4',  desc: 'Asphalt Sealer (5 Gal)',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'apm5',  desc: 'Crack Filler Hot-Pour (Block)',            qty: 1, unit: 'ea', cost: 0 },
    { id: 'apm6',  desc: 'Cold Patch (50lb Bag)',                    qty: 1, unit: 'bag',cost: 0 },
    { id: 'apm7',  desc: 'Geotextile Fabric (Roll)',                 qty: 1, unit: 'roll',cost: 0 },
    { id: 'apm8',  desc: 'Striping Paint (5 Gal)',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'apm9',  desc: 'Wheel Stops / Bollards',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'apm10', desc: 'Misc Paving Supplies',                     qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'ape1', desc: 'Asphalt Paver (Self-Propelled)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'ape2', desc: 'Vibratory Roller (1-3 Ton)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'ape3', desc: 'Skid Steer w/ Bucket',               qty: 1, unit: 'day', rate: 0 },
    { id: 'ape4', desc: 'Sealcoat Spray Rig',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'ape5', desc: 'Crack Fill Melter',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'ape6', desc: 'Striping Machine',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'ape7', desc: 'Plate Compactor',                    qty: 1, unit: 'day', rate: 0 },
  ],
};
