// Restoration — water, fire, smoke, mold, biohazard cleanup; insurance-driven work.
// Reference: IICRC S500 (water), S520 (mold), S540 (biohazard), S700 (fire/smoke).
// Labor rate per BLS 47-4099 ($95/hr typical, IICRC-certified).

export default {
  color:            '#1d4ed8',
  stripe:           'linear-gradient(90deg, #1e40af, #3b82f6)',
  label:            'Restoration',
  docLabel:         'Restoration & Recovery Services',
  category:         'Service',
  defaultLaborRate: 95,
  laborTitle:       'Restoration Labor',
  licenseNote:      'IICRC-Certified Water/Fire/Mold Restoration',
  scopePlaceholder: 'Describe the restoration scope — loss type (Cat 1/2/3 water, fire/smoke, mold, biohazard), affected square footage and rooms, mitigation steps (extraction, drying, demo, antimicrobial), insurance carrier coordination, Xactimate documentation, and reconstruction handoff.',
  matLibrary: [
    { id: 'rsm1',  desc: 'Antimicrobial Treatment (Gal)',           qty: 1, unit: 'gal', cost: 0 },
    { id: 'rsm2',  desc: 'Containment Plastic 6-Mil (Roll)',         qty: 1, unit: 'roll',cost: 0 },
    { id: 'rsm3',  desc: 'HEPA Filter (Box of 4)',                   qty: 1, unit: 'box', cost: 0 },
    { id: 'rsm4',  desc: 'Smoke Sponge (Each)',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'rsm5',  desc: 'Odor Counteractant Pellets (lb)',          qty: 1, unit: 'lb',  cost: 0 },
    { id: 'rsm6',  desc: 'Encapsulant Spray (5 Gal)',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'rsm7',  desc: 'Drywall Replacement (Sq Ft)',               qty: 1, unit: 'sf',  cost: 0 },
    { id: 'rsm8',  desc: 'Insulation Replacement (Sq Ft)',            qty: 1, unit: 'sf',  cost: 0 },
    { id: 'rsm9',  desc: 'Tyvek Suit (Each)',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'rsm10', desc: 'Misc Restoration Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'rse1', desc: 'Air Mover (Per Day)',                qty: 1, unit: 'day', rate: 0 },
    { id: 'rse2', desc: 'Dehumidifier LGR (Per Day)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'rse3', desc: 'Air Scrubber HEPA (Per Day)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'rse4', desc: 'Truck-Mount Extractor',                qty: 1, unit: 'day', rate: 0 },
    { id: 'rse5', desc: 'Hydroxyl/Ozone Generator',             qty: 1, unit: 'day', rate: 0 },
    { id: 'rse6', desc: 'Thermal Imaging Camera',               qty: 1, unit: 'day', rate: 0 },
  ],
};
