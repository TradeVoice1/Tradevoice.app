// Low Voltage / Networking — Cat6 wiring, fiber, AV cabling, structured wiring panels.
// Reference: BICSI TDMM, EIA/TIA 568 (cabling), NEC Article 800.
// Labor rate per BLS 47-2111 ($95/hr typical, certified low-voltage tech).

export default {
  color:            '#4338ca',
  stripe:           'linear-gradient(90deg, #3730a3, #6366f1)',
  label:            'Low Voltage / Networking',
  docLabel:         'Low Voltage & Networking Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Low Voltage Labor',
  licenseNote:      'Licensed Low Voltage Contractor (BICSI)',
  scopePlaceholder: 'Describe the low-voltage scope — cabling type (Cat6, Cat6A, fiber, coax), number of drops, terminations (jacks, patch panel), structured wiring panel, network rack, fish/conceal vs surface raceway, certification (Fluke test reports), and labeling/documentation.',
  matLibrary: [
    { id: 'lvm1',  desc: 'Cat6 Cable 1000ft Box',                    qty: 1, unit: 'box',cost: 0 },
    { id: 'lvm2',  desc: 'Cat6A Shielded Cable 1000ft',              qty: 1, unit: 'box',cost: 0 },
    { id: 'lvm3',  desc: 'OM4 Multi-mode Fiber 1000ft',              qty: 1, unit: 'box',cost: 0 },
    { id: 'lvm4',  desc: 'RG6 Quad Shield Coax (Roll)',              qty: 1, unit: 'roll',cost: 0 },
    { id: 'lvm5',  desc: 'RJ45 Cat6 Jack (Each)',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm6',  desc: '24-Port Patch Panel',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm7',  desc: 'Wall Plate w/ 2 Ports',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm8',  desc: 'Single Gang Low-Voltage Bracket',           qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm9',  desc: 'Network Rack 12U Wall Mount',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm10', desc: 'Patch Cord 3ft (Each)',                     qty: 1, unit: 'ea', cost: 0 },
    { id: 'lvm11', desc: 'Cable Ties / Velcro Straps',                qty: 1, unit: 'lot',cost: 0 },
    { id: 'lvm12', desc: 'Misc Low-Voltage Hardware',                  qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'lve1', desc: 'Fluke Cable Tester / Certifier',     qty: 1, unit: 'day', rate: 0 },
    { id: 'lve2', desc: 'Fiber Fusion Splicer',                qty: 1, unit: 'day', rate: 0 },
    { id: 'lve3', desc: 'Cable Pulling Lubricant + Fish Tape',  qty: 1, unit: 'day', rate: 0 },
    { id: 'lve4', desc: 'Punch-Down Tool / Crimper',           qty: 1, unit: 'day', rate: 0 },
    { id: 'lve5', desc: 'Network Analyzer',                    qty: 1, unit: 'day', rate: 0 },
    { id: 'lve6', desc: 'Tone & Probe Set',                    qty: 1, unit: 'day', rate: 0 },
  ],
};
