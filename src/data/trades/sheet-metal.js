// Sheet Metal — ductwork fabrication, custom flashing, architectural panels, gutters.
// Reference: SMACNA HVAC Duct Construction Standards, SMACNA Architectural Sheet Metal Manual.
// Labor rate per BLS 47-2211 ($95/hr typical).

export default {
  color:            '#475569',
  stripe:           'linear-gradient(90deg, #1e293b, #64748b)',
  label:            'Sheet Metal',
  docLabel:         'Sheet Metal Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Sheet Metal Labor',
  licenseNote:      'Licensed Sheet Metal Contractor',
  scopePlaceholder: 'Describe the sheet metal scope — duct fabrication and install (gauge, dimensions, lin ft), custom flashing, architectural panels, copper or stainless work, joints (drive cleats, snaplock, double-lock), insulation, and any seismic or fire-rating requirements.',
  matLibrary: [
    { id: 'smm1',  desc: '26ga Galvanized Sheet 4x8',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm2',  desc: '24ga Galvanized Sheet 4x10',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm3',  desc: 'Stainless Steel 304 Sheet 4x8',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm4',  desc: 'Copper Sheet 16oz 3x8',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm5',  desc: 'Round Pipe 8" Snaplock 5ft',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm6',  desc: 'Rectangular Duct Fabricated (Per Lin Ft)',  qty: 1, unit: 'lf',  cost: 0 },
    { id: 'smm7',  desc: 'Duct Insulation R-6 (Per Sq Ft)',           qty: 1, unit: 'sf',  cost: 0 },
    { id: 'smm8',  desc: 'TDC / Slip & Drive Connector (Each)',       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm9',  desc: 'Pop Rivets 1/8" (Box)',                     qty: 1, unit: 'box', cost: 0 },
    { id: 'smm10', desc: 'Sheet Metal Screws #10 (Box)',              qty: 1, unit: 'box', cost: 0 },
    { id: 'smm11', desc: 'Mastic Sealant / Mastic Tape',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'smm12', desc: 'Misc Sheet Metal Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'sme1', desc: 'Sheet Metal Brake (Cornice)',         qty: 1, unit: 'day', rate: 0 },
    { id: 'sme2', desc: 'Slip Roll / Forming Roll',            qty: 1, unit: 'day', rate: 0 },
    { id: 'sme3', desc: 'Plasma Cutter',                       qty: 1, unit: 'day', rate: 0 },
    { id: 'sme4', desc: 'Power Shears (Aviation)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'sme5', desc: 'Pop Rivet Tool (Pneumatic)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'sme6', desc: 'Spot Welder',                         qty: 1, unit: 'day', rate: 0 },
  ],
};
