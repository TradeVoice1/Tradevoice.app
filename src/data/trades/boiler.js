// Boiler — hydronic heating, steam, condensing, residential to commercial.
// Reference: ASME Boiler & Pressure Vessel Code, NBIC, ASHRAE Handbook.
// Labor rate per BLS 47-2152 ($115/hr typical for licensed boiler tech).

export default {
  color:            '#9a3412',
  stripe:           'linear-gradient(90deg, #7c2d12, #ea580c)',
  label:            'Boiler / Hydronic',
  docLabel:         'Boiler & Hydronic Services',
  category:         'Construction',
  defaultLaborRate: 115,
  laborTitle:       'Boiler Labor',
  licenseNote:      'Licensed Boiler Tech / Master Plumber',
  scopePlaceholder: 'Describe the boiler scope — equipment type (cast iron, condensing, steam), capacity (BTU), fuel (gas, oil, propane), distribution (radiators, baseboard, in-floor), zoning, indirect water heater, controls, venting (Cat I, II, IV), and inspection/permit needs.',
  matLibrary: [
    { id: 'blm1',  desc: 'Cast Iron Gas Boiler 80kBTU',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm2',  desc: 'Condensing Gas Boiler 95% Eff',            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm3',  desc: 'Indirect Water Heater 50gal',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm4',  desc: 'Circulator Pump (Taco/Grundfos)',           qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm5',  desc: 'Expansion Tank #30',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm6',  desc: 'PEX Tubing 1/2" 100ft Coil',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm7',  desc: 'Baseboard Element 6ft',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm8',  desc: 'Zone Valve 3/4"',                          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm9',  desc: 'Vent Pipe PVC Sched 40 (Lin Ft)',         qty: 1, unit: 'lf',  cost: 0 },
    { id: 'blm10', desc: 'Aquastat / Boiler Control',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm11', desc: 'Backflow Preventer',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'blm12', desc: 'Misc Boiler Hardware',                     qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'ble1', desc: 'Combustion Analyzer',                qty: 1, unit: 'day', rate: 0 },
    { id: 'ble2', desc: 'Press Tool / ProPress',               qty: 1, unit: 'day', rate: 0 },
    { id: 'ble3', desc: 'Pipe Threader',                       qty: 1, unit: 'day', rate: 0 },
    { id: 'ble4', desc: 'Hand Truck / Boiler Dolly',           qty: 1, unit: 'day', rate: 0 },
    { id: 'ble5', desc: 'Multimeter / Test Kit',               qty: 1, unit: 'day', rate: 0 },
    { id: 'ble6', desc: 'Hydrostatic Test Pump',               qty: 1, unit: 'day', rate: 0 },
  ],
};
