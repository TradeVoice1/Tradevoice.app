// Fire Protection — sprinkler systems, fire alarm, extinguishers, suppression.
// Reference: NFPA 13/72/25, NICET certification standards, ICC IFC.
// Labor rate per BLS 47-2152 ($115/hr typical for NICET-certified tech).

export default {
  color:            '#dc2626',
  stripe:           'linear-gradient(90deg, #b91c1c, #ef4444)',
  label:            'Fire Protection',
  docLabel:         'Fire Protection Services',
  category:         'Construction',
  defaultLaborRate: 115,
  laborTitle:       'Fire Protection Labor',
  licenseNote:      'NICET-Certified Fire Sprinkler / Alarm Tech',
  scopePlaceholder: 'Describe the fire protection scope — system type (wet/dry sprinkler, fire alarm, suppression, extinguishers), new install vs inspection, NFPA 25 testing, AHJ permit/inspection coordination, monitoring service, and as-built drawings.',
  matLibrary: [
    { id: 'fpm1',  desc: 'Sprinkler Head Pendant K5.6',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm2',  desc: 'Sprinkler Head Concealed',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm3',  desc: '1" Sched 40 Black Pipe 21ft',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm4',  desc: '2" Sched 40 Black Pipe 21ft',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm5',  desc: 'Sprinkler Riser w/ Backflow',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm6',  desc: 'Tamper / Flow Switch',                    qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm7',  desc: 'Fire Alarm Panel',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm8',  desc: 'Smoke Detector Photoelectric',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm9',  desc: 'Pull Station Manual',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm10', desc: 'Horn-Strobe Notification Device',          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm11', desc: 'ABC Fire Extinguisher 5lb',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'fpm12', desc: 'Misc Fire Protection Hardware',            qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'fpe1', desc: 'Pipe Threader / Cutter',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fpe2', desc: 'Hydrostatic Test Pump',               qty: 1, unit: 'day', rate: 0 },
    { id: 'fpe3', desc: 'Scissor Lift Rental',                 qty: 1, unit: 'day', rate: 0 },
    { id: 'fpe4', desc: 'Fire Alarm Loop Test Set',            qty: 1, unit: 'day', rate: 0 },
    { id: 'fpe5', desc: 'Pipe Ream / Deburr Tool',             qty: 1, unit: 'day', rate: 0 },
    { id: 'fpe6', desc: 'Drilling / Coring Tools',              qty: 1, unit: 'day', rate: 0 },
  ],
};
