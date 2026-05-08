// HVAC — heating, ventilation, air conditioning, refrigerant work, ductwork.
// Reference: ASHRAE Handbook (Fundamentals/HVAC Systems), ACCA Manual J/D/S.
// Labor rate per BLS 49-9021 ($95/hr typical for EPA 608 certified tech).

export default {
  color:            '#0891b2',
  stripe:           'linear-gradient(90deg, #0e7490, #06b6d4)',
  label:            'HVAC',
  docLabel:         'HVAC Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'HVAC Labor',
  licenseNote:      'EPA 608 Certified Technician',
  scopePlaceholder: 'Describe the HVAC work to be performed — equipment installation, preventive maintenance, refrigerant service, ductwork, thermostat and controls, air quality, etc. Note any EPA certification or permit requirements.',
  matLibrary: [
    { id: 'hm1',  desc: 'MERV-8 Filter 20x20x1',                  qty: 1, unit: 'ea',  cost: 12.00 },
    { id: 'hm2',  desc: 'MERV-11 Filter 20x20x2',                  qty: 1, unit: 'ea',  cost: 19.00 },
    { id: 'hm3',  desc: 'Foaming Coil Cleaner',                    qty: 1, unit: 'ea',  cost: 18.00 },
    { id: 'hm4',  desc: 'R-410A Refrigerant (lb)',                  qty: 1, unit: 'lb',  cost: 22.00 },
    { id: 'hm5',  desc: 'Capacitor, Dual Run 45/5 MFD',            qty: 1, unit: 'ea',  cost: 28.00 },
    { id: 'hm6',  desc: 'Contactor 40A 24V Coil',                  qty: 1, unit: 'ea',  cost: 22.00 },
    { id: 'hm7',  desc: 'Programmable Thermostat',                 qty: 1, unit: 'ea',  cost: 55.00 },
    { id: 'hm8',  desc: 'Smart Thermostat (WiFi)',                  qty: 1, unit: 'ea',  cost: 135.00},
    { id: 'hm9',  desc: 'Flex Duct 6" (10ft)',                      qty: 1, unit: 'ea',  cost: 14.00 },
    { id: 'hm10', desc: 'Sheet Metal Duct (Straight 24")',           qty: 1, unit: 'ea',  cost: 18.00 },
    { id: 'hm11', desc: 'Condensate Drain Pan Treatment Tabs',      qty: 1, unit: 'box', cost: 9.00  },
    { id: 'hm12', desc: 'Misc HVAC Consumables',                    qty: 1, unit: 'lot', cost: 30.00 },
  ],
  equipLibrary: [
    { id: 'he1', desc: 'Refrigerant Recovery Machine',      qty: 1, unit: 'day', rate: 75.00  },
    { id: 'he2', desc: 'Vacuum Pump & Manifold Gauge Set',  qty: 1, unit: 'day', rate: 40.00  },
    { id: 'he3', desc: 'Refrigerant Scale (Digital)',        qty: 1, unit: 'day', rate: 20.00  },
    { id: 'he4', desc: 'Duct Pressure Test Kit',             qty: 1, unit: 'day', rate: 55.00  },
    { id: 'he5', desc: 'Scissor Lift Rental',                qty: 1, unit: 'day', rate: 220.00 },
    { id: 'he6', desc: 'Nitrogen Tank & Regulator',          qty: 1, unit: 'day', rate: 35.00  },
  ],
};
