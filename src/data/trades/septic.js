// Septic — system installation, repair, pumping, inspection, drain field, lift stations.
// Reference: EPA Decentralized Wastewater Treatment guides, NEHA standards, state codes.
// Labor rate per BLS 47-2152 ($110/hr typical for licensed septic installer).

export default {
  color:            '#15803d',
  stripe:           'linear-gradient(90deg, #166534, #22c55e)',
  label:            'Septic',
  docLabel:         'Septic Services',
  category:         'Construction',
  defaultLaborRate: 110,
  laborTitle:       'Septic Labor',
  licenseNote:      'Licensed Septic System Installer',
  scopePlaceholder: 'Describe the septic scope — new install, repair, pump-out, inspection, drain field replacement, lift station, riser/lid install. Note tank size, system type (conventional, aerobic, mound), soil/perc test results, county permits, and pumping interval.',
  matLibrary: [
    { id: 'spm1',  desc: '1,000 Gal Concrete Tank',                 qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm2',  desc: '1,500 Gal Concrete Tank',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm3',  desc: 'Plastic Tank 1,250 Gal',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm4',  desc: 'Riser Kit 24" w/ Lid',                     qty: 1, unit: 'set', cost: 0 },
    { id: 'spm5',  desc: '4" Schedule 40 Pipe 10ft',                 qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm6',  desc: '4" Perforated Drain Pipe (Per Lin Ft)',    qty: 1, unit: 'lf',  cost: 0 },
    { id: 'spm7',  desc: 'Distribution Box',                         qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm8',  desc: 'Drain Stone (Cu Yd)',                      qty: 1, unit: 'cy',  cost: 0 },
    { id: 'spm9',  desc: 'Filter Fabric (Roll)',                     qty: 1, unit: 'roll',cost: 0 },
    { id: 'spm10', desc: 'Effluent Filter',                          qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm11', desc: 'Lift Pump (Submersible)',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm12', desc: 'Aerobic Treatment Unit',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm13', desc: 'Permit / Inspection Fees',                  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'spm14', desc: 'Misc Septic Supplies',                     qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'spe1', desc: 'Excavator (Tank Set)',               qty: 1, unit: 'day', rate: 0 },
    { id: 'spe2', desc: 'Vacuum Pump Truck',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'spe3', desc: 'Skid Steer w/ Bucket',               qty: 1, unit: 'day', rate: 0 },
    { id: 'spe4', desc: 'Dump Truck (Spoils)',                qty: 1, unit: 'day', rate: 0 },
    { id: 'spe5', desc: 'Camera Inspection Rig',              qty: 1, unit: 'day', rate: 0 },
    { id: 'spe6', desc: 'Plate Compactor',                    qty: 1, unit: 'day', rate: 0 },
  ],
};
