// Locksmith — residential, commercial, automotive, master key systems, safes, access control.
// Reference: ALOA Best Practices, BHMA standards (ANSI/BHMA A156 series).
// Labor rate per BLS 49-9094 ($85/hr typical).

export default {
  color:            '#7c2d12',
  stripe:           'linear-gradient(90deg, #7c2d12, #b45309)',
  label:            'Locksmith',
  docLabel:         'Locksmith Services',
  category:         'Construction',
  defaultLaborRate: 85,
  laborTitle:       'Locksmith Labor',
  licenseNote:      'Licensed Locksmith',
  scopePlaceholder: 'Describe the locksmith scope — re-key, lock replacement, master key system, safe service, lockout, automotive (key cutting, programming, transponder), commercial (panic hardware, access control), and warranty terms.',
  matLibrary: [
    { id: 'lkm1',  desc: 'Residential Deadbolt Grade 2',            qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm2',  desc: 'Commercial Mortise Lockset',               qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm3',  desc: 'Smart Lock (Yale, Schlage, etc)',          qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm4',  desc: 'Re-Key Cylinder (Each)',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm5',  desc: 'Key Blank (Each)',                         qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm6',  desc: 'Transponder Key Blank',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm7',  desc: 'Panic Bar / Exit Device',                  qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm8',  desc: 'Door Closer Surface Mount',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm9',  desc: 'Safe Combination Dial',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm10', desc: 'High-Security Cylinder (Medeco/Mul-T-Lock)',qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm11', desc: 'Lock Strike Plate / Reinforcer',            qty: 1, unit: 'ea', cost: 0 },
    { id: 'lkm12', desc: 'Misc Locksmith Hardware',                   qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'lke1', desc: 'Key Cutting Machine (Mobile)',       qty: 1, unit: 'day', rate: 0 },
    { id: 'lke2', desc: 'Lock Pick Set / Bump Keys',           qty: 1, unit: 'day', rate: 0 },
    { id: 'lke3', desc: 'Transponder Programmer',              qty: 1, unit: 'day', rate: 0 },
    { id: 'lke4', desc: 'Safe Manipulation Tools',             qty: 1, unit: 'day', rate: 0 },
    { id: 'lke5', desc: 'Drill / Borescope (Drilling)',        qty: 1, unit: 'day', rate: 0 },
    { id: 'lke6', desc: 'Mobile Service Van Setup',             qty: 1, unit: 'day', rate: 0 },
  ],
};
