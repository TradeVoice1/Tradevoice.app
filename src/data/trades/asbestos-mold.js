// Asbestos / Mold Remediation — abatement, encapsulation, hazmat removal, post-clearance.
// Reference: EPA NESHAP 40 CFR 61, IICRC S520 (mold), AHERA, OSHA 1926.1101.
// Labor rate per BLS 47-4041 ($125/hr typical, certified hazmat tech).

export default {
  color:            '#854d0e',
  stripe:           'linear-gradient(90deg, #713f12, #a16207)',
  label:            'Asbestos / Mold',
  docLabel:         'Asbestos & Mold Remediation',
  category:         'Construction',
  defaultLaborRate: 125,
  laborTitle:       'Hazmat Remediation Labor',
  licenseNote:      'Licensed Asbestos / Mold Remediation Contractor',
  scopePlaceholder: 'Describe the abatement/remediation scope — material identified (asbestos type, mold genus), square footage, containment setup (negative air, sealed plastic), removal method (wet, glove bag), waste disposal (manifest), post-clearance air sampling, and any third-party industrial hygienist coordination.',
  matLibrary: [
    { id: 'amm1',  desc: '6-Mil Plastic Sheeting (Roll)',           qty: 1, unit: 'roll',cost: 0 },
    { id: 'amm2',  desc: 'Tyvek Suit (Each)',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm3',  desc: 'P100 Respirator Cartridge (Pair)',         qty: 1, unit: 'pr', cost: 0 },
    { id: 'amm4',  desc: 'HEPA Vacuum Bag (Each)',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm5',  desc: 'Asbestos Bag w/ Manifest',                 qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm6',  desc: 'Antimicrobial Cleaner (Gallon)',           qty: 1, unit: 'gal',cost: 0 },
    { id: 'amm7',  desc: 'Encapsulant Spray (5 Gal)',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm8',  desc: 'Disposal Manifest / Tipping Fee',          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm9',  desc: 'Post-Clearance Air Sample',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'amm10', desc: 'Decon Chamber Materials',                  qty: 1, unit: 'lot', cost: 0 },
    { id: 'amm11', desc: 'Misc Containment Supplies',                qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'ame1', desc: 'Negative Air Machine HEPA',          qty: 1, unit: 'day', rate: 0 },
    { id: 'ame2', desc: 'Air Scrubber',                       qty: 1, unit: 'day', rate: 0 },
    { id: 'ame3', desc: 'HEPA Vacuum',                        qty: 1, unit: 'day', rate: 0 },
    { id: 'ame4', desc: 'Sprayer (Encapsulation)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'ame5', desc: 'PPE / Decon Chamber',                qty: 1, unit: 'day', rate: 0 },
    { id: 'ame6', desc: 'Air Sampling Pump',                   qty: 1, unit: 'day', rate: 0 },
  ],
};
