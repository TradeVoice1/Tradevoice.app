// Lawn Care — mowing, fertilization, weed control, aeration, overseeding.
// Reference: NALP Best Practices, EPA pesticide certification.
// Labor rate per BLS 37-3011 ($55/hr typical).

export default {
  color:            '#84cc16',
  stripe:           'linear-gradient(90deg, #65a30d, #bef264)',
  label:            'Lawn Care',
  docLabel:         'Lawn Care Services',
  category:         'Service',
  defaultLaborRate: 55,
  laborTitle:       'Lawn Care Labor',
  licenseNote:      'EPA-Certified Pesticide Applicator',
  scopePlaceholder: 'Describe the lawn-care scope — service frequency (weekly mow, monthly fert), property size, services (mow/edge/trim/blow, fertilization rounds, weed/pest control, aeration, overseeding, dethatching). Note seasonal contract terms and re-treatment policy.',
  matLibrary: [
    { id: 'lcm1',  desc: 'Pre-Emergent Herbicide (Per Acre)',       qty: 1, unit: 'ac', cost: 0 },
    { id: 'lcm2',  desc: 'Slow-Release Fertilizer (Per kSqFt)',     qty: 1, unit: 'ksf',cost: 0 },
    { id: 'lcm3',  desc: 'Broadleaf Herbicide (Per Acre)',          qty: 1, unit: 'ac', cost: 0 },
    { id: 'lcm4',  desc: 'Grub Control (Per kSqFt)',                qty: 1, unit: 'ksf',cost: 0 },
    { id: 'lcm5',  desc: 'Lime Pelletized (50lb Bag)',              qty: 1, unit: 'bag',cost: 0 },
    { id: 'lcm6',  desc: 'Grass Seed (Per lb)',                      qty: 1, unit: 'lb',cost: 0 },
    { id: 'lcm7',  desc: 'Mulch Hardwood (Cu Yd)',                   qty: 1, unit: 'cy', cost: 0 },
    { id: 'lcm8',  desc: 'Trimmer Line Spool',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'lcm9',  desc: 'Blower Fuel Mix (Gallon)',                qty: 1, unit: 'gal',cost: 0 },
    { id: 'lcm10', desc: 'Misc Lawn Care Consumables',               qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'lce1', desc: 'Zero-Turn Mower 60"',                qty: 1, unit: 'day', rate: 0 },
    { id: 'lce2', desc: 'Aerator (Tow-Behind)',                qty: 1, unit: 'day', rate: 0 },
    { id: 'lce3', desc: 'Backpack Sprayer',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'lce4', desc: 'Push-Spreader (Fertilizer)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'lce5', desc: 'String Trimmer / Blower Set',         qty: 1, unit: 'day', rate: 0 },
    { id: 'lce6', desc: 'Dethatcher / Power Rake',              qty: 1, unit: 'day', rate: 0 },
  ],
};
