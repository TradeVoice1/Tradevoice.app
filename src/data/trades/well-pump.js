// Well & Pump — well drilling, pump install/repair, water filtration, pressure tanks.
// Reference: NGWA standards (National Ground Water Association), state well codes.
// Labor rate per BLS 47-5081 ($110/hr typical, licensed driller / pump tech).

export default {
  color:            '#0c4a6e',
  stripe:           'linear-gradient(90deg, #082f49, #0284c7)',
  label:            'Well / Pump',
  docLabel:         'Well & Pump Services',
  category:         'Construction',
  defaultLaborRate: 110,
  laborTitle:       'Well / Pump Labor',
  licenseNote:      'Licensed Well Driller / Pump Installer (NGWA)',
  scopePlaceholder: 'Describe the well/pump scope — new well drilling, pump install, pump pull and replacement, pressure tank, water testing/treatment, control box, well chlorination. Note depth, GPM, casing material, and any state/county permits.',
  matLibrary: [
    { id: 'wpm1',  desc: 'Submersible Pump 1HP',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm2',  desc: 'Submersible Pump 2HP',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm3',  desc: 'Pressure Tank 32-Gal',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm4',  desc: 'Pressure Tank 86-Gal',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm5',  desc: 'Pump Control Box',                        qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm6',  desc: 'Pressure Switch 30/50',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm7',  desc: 'Drop Pipe 1" (Per Lin Ft)',                qty: 1, unit: 'lf',  cost: 0 },
    { id: 'wpm8',  desc: 'Pitless Adapter',                          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm9',  desc: 'Pump Wire 12/3 (Per Lin Ft)',              qty: 1, unit: 'lf',  cost: 0 },
    { id: 'wpm10', desc: 'Water Filtration System',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm11', desc: 'Permit / Water Test Fee',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'wpm12', desc: 'Misc Well/Pump Supplies',                   qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'wpe1', desc: 'Pump Hoist Rig',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe2', desc: 'Well Drilling Rig (Subcontract)',     qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe3', desc: 'Wire / Drop Pipe Reels',              qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe4', desc: 'Multimeter / Megger Test Set',        qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe5', desc: 'Bentonite Pump (Grouting)',            qty: 1, unit: 'day', rate: 0 },
    { id: 'wpe6', desc: 'Mini-Excavator (Pitless Access)',      qty: 1, unit: 'day', rate: 0 },
  ],
};
