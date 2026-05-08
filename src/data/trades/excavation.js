// Excavation — site prep, digging, grading, trenching, demolition support, hauling.
// Reference: OSHA 1926 Subpart P (Excavations), ASCE Standard for Site Civil.
// Labor rate per BLS 47-2073 ($125/hr typical, includes operator + equipment).

export default {
  color:            '#a16207',
  stripe:           'linear-gradient(90deg, #713f12, #ca8a04)',
  label:            'Excavation',
  docLabel:         'Excavation Services',
  category:         'Construction',
  defaultLaborRate: 125,
  laborTitle:       'Excavation Labor',
  licenseNote:      'Licensed Excavation Contractor',
  scopePlaceholder: 'Describe the excavation scope — site clearing, foundation dig, trench (depth, length), grading, fill, hauling. Note utility locates (call-before-you-dig), shoring/sloping requirements (OSHA), spoil disposal, and any required permits or surveys.',
  matLibrary: [
    { id: 'exm1',  desc: 'Topsoil Screened (Cu Yd)',                qty: 1, unit: 'cy',  cost: 0 },
    { id: 'exm2',  desc: 'Sand (Cu Yd)',                             qty: 1, unit: 'cy',  cost: 0 },
    { id: 'exm3',  desc: 'Gravel #57 (Cu Yd)',                       qty: 1, unit: 'cy',  cost: 0 },
    { id: 'exm4',  desc: 'Crushed Stone Base (Cu Yd)',               qty: 1, unit: 'cy',  cost: 0 },
    { id: 'exm5',  desc: 'Geotextile Fabric (Roll)',                  qty: 1, unit: 'roll',cost: 0 },
    { id: 'exm6',  desc: 'Silt Fence 100ft Roll',                    qty: 1, unit: 'roll',cost: 0 },
    { id: 'exm7',  desc: 'Erosion Control Blanket (Roll)',            qty: 1, unit: 'roll',cost: 0 },
    { id: 'exm8',  desc: 'Locator Marking Paint (Can)',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'exm9',  desc: 'Spoils Haul (Per Truck Load)',              qty: 1, unit: 'load',cost: 0 },
    { id: 'exm10', desc: 'Misc Excavation Supplies',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'exe1', desc: 'Mini-Excavator (3-Ton)',             qty: 1, unit: 'day', rate: 0 },
    { id: 'exe2', desc: 'Backhoe Loader',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'exe3', desc: 'Skid Steer w/ Bucket',                qty: 1, unit: 'day', rate: 0 },
    { id: 'exe4', desc: 'Excavator (10-Ton)',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'exe5', desc: 'Dump Truck (10-Yd)',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'exe6', desc: 'Trench Box / Shoring',                qty: 1, unit: 'day', rate: 0 },
    { id: 'exe7', desc: 'Plate Compactor',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'exe8', desc: 'Laser Level / Transit',               qty: 1, unit: 'day', rate: 0 },
  ],
};
