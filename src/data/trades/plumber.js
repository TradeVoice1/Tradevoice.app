// Plumber — fixtures, supply, drainage, water heaters, gas lines.
// Reference: ASPE Plumbing Engineering Design Handbook 12th ed, IPC 2024, UPC 2024.
// Labor rate per BLS 47-2152 ($125/hr typical for licensed master plumber).

export default {
  color:            '#2563eb',
  stripe:           'linear-gradient(90deg, #1d4ed8, #3b82f6)',
  label:            'Plumbing',
  docLabel:         'Plumbing Services',
  category:         'Construction',
  defaultLaborRate: 125,
  laborTitle:       'Plumbing Labor',
  licenseNote:      'Licensed Master Plumber',
  scopePlaceholder: 'Describe the plumbing work to be performed — pipe repairs, fixture installations, drain work, water heater service, shut-off valves, etc. Specify what materials are included and any scope exclusions.',
  matLibrary: [
    { id: 'pm1',  desc: '1/2" Ball Valve, Quarter-Turn',        qty: 1, unit: 'ea',   cost: 38.50 },
    { id: 'pm2',  desc: '3/4" Ball Valve, Quarter-Turn',        qty: 1, unit: 'ea',   cost: 44.00 },
    { id: 'pm3',  desc: 'Braided SS Supply Line 12"',            qty: 1, unit: 'ea',   cost: 14.00 },
    { id: 'pm4',  desc: 'Braided SS Supply Line 24"',            qty: 1, unit: 'ea',   cost: 18.00 },
    { id: 'pm5',  desc: 'PVC 3/4" Schedule 40, 10ft',           qty: 1, unit: 'ea',   cost: 8.50  },
    { id: 'pm6',  desc: 'P-Trap 1-1/2" PVC',                    qty: 1, unit: 'ea',   cost: 7.00  },
    { id: 'pm7',  desc: 'Wax Ring w/ Closet Bolt Kit',           qty: 1, unit: 'ea',   cost: 11.00 },
    { id: 'pm8',  desc: 'Drain Cleanout Plug 3"',                qty: 1, unit: 'ea',   cost: 5.50  },
    { id: 'pm9',  desc: 'Teflon Thread Sealant Tape',            qty: 1, unit: 'roll', cost: 2.50  },
    { id: 'pm10', desc: 'Copper 3/4" Type L, 10ft',              qty: 1, unit: 'ea',   cost: 22.00 },
    { id: 'pm11', desc: 'SharkBite Push-to-Connect 1/2"',        qty: 1, unit: 'ea',   cost: 9.00  },
    { id: 'pm12', desc: 'Misc Plumbing Fittings & Consumables',  qty: 1, unit: 'lot',  cost: 25.00 },
  ],
  equipLibrary: [
    { id: 'pe1', desc: 'Pipe Press Tool Rental',          qty: 1, unit: 'day', rate: 65.00  },
    { id: 'pe2', desc: 'Pipe Cutter (Large Diameter)',    qty: 1, unit: 'day', rate: 35.00  },
    { id: 'pe3', desc: 'Drain Snake / Auger Rental',      qty: 1, unit: 'day', rate: 45.00  },
    { id: 'pe4', desc: 'Hydro-Jetter Rental',             qty: 1, unit: 'day', rate: 180.00 },
    { id: 'pe5', desc: 'Leak Detection Camera',           qty: 1, unit: 'day', rate: 75.00  },
    { id: 'pe6', desc: 'Trencher Rental',                 qty: 1, unit: 'day', rate: 185.00 },
  ],
};
