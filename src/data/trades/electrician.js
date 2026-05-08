// Electrician — wiring, panel work, lighting, low-voltage entry, service upgrades.
// Reference: NEC 2023 (NFPA 70), NECA Standard Practice for Good Workmanship.
// Labor rate per BLS 47-2111 ($115/hr typical for licensed master electrician).

export default {
  color:            '#d97706',
  stripe:           'linear-gradient(90deg, #b45309, #f59e0b)',
  label:            'Electrical',
  docLabel:         'Electrical Services',
  category:         'Construction',
  defaultLaborRate: 115,
  laborTitle:       'Electrical Labor',
  licenseNote:      'Licensed Master Electrician',
  scopePlaceholder: 'Describe the electrical work to be performed — panel upgrades, wiring, outlet and switch installation, lighting, service entry, GFCI/AFCI protection, etc. Note permit requirements if applicable.',
  matLibrary: [
    { id: 'em1',  desc: 'GFCI Outlet 20A Tamper-Resistant',      qty: 1, unit: 'ea',  cost: 18.00 },
    { id: 'em2',  desc: 'AFCI/GFCI Combo Outlet 20A',            qty: 1, unit: 'ea',  cost: 32.00 },
    { id: 'em3',  desc: '15A Single-Pole Breaker',                qty: 1, unit: 'ea',  cost: 9.50  },
    { id: 'em4',  desc: '20A Single-Pole Breaker',                qty: 1, unit: 'ea',  cost: 11.00 },
    { id: 'em5',  desc: '200A Main Breaker Panel',                qty: 1, unit: 'ea',  cost: 285.00},
    { id: 'em6',  desc: 'Romex 12/2 Wire (50ft)',                 qty: 1, unit: 'ea',  cost: 34.00 },
    { id: 'em7',  desc: 'Romex 14/2 Wire (50ft)',                 qty: 1, unit: 'ea',  cost: 26.00 },
    { id: 'em8',  desc: '3/4" EMT Conduit (10ft)',                qty: 1, unit: 'ea',  cost: 7.50  },
    { id: 'em9',  desc: 'Decora Single-Pole Switch 15A',          qty: 1, unit: 'ea',  cost: 5.00  },
    { id: 'em10', desc: 'LED Recessed Can 6" (Trim Kit)',          qty: 1, unit: 'ea',  cost: 22.00 },
    { id: 'em11', desc: 'Wire Nuts & Connectors (Assorted)',       qty: 1, unit: 'lot', cost: 8.00  },
    { id: 'em12', desc: 'Misc Electrical Consumables',             qty: 1, unit: 'lot', cost: 20.00 },
  ],
  equipLibrary: [
    { id: 'ee1', desc: 'Conduit Bender (Heavy)',           qty: 1, unit: 'day', rate: 40.00  },
    { id: 'ee2', desc: 'Scissor Lift Rental',              qty: 1, unit: 'day', rate: 220.00 },
    { id: 'ee3', desc: 'Thermal Imaging Camera',           qty: 1, unit: 'day', rate: 75.00  },
    { id: 'ee4', desc: 'Generator (10kW) Rental',          qty: 1, unit: 'day', rate: 95.00  },
    { id: 'ee5', desc: 'Cable Puller / Fish Tape Kit',     qty: 1, unit: 'day', rate: 30.00  },
    { id: 'ee6', desc: 'Multimeter & Test Equipment Set',  qty: 1, unit: 'day', rate: 25.00  },
  ],
};
