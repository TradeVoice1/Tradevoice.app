// Appliance Repair — refrigerators, washers/dryers, dishwashers, ovens, mounted appliances.
// Reference: NASTeC certification, manufacturer-specific service authorizations.
// Labor rate per BLS 49-9031 ($95/hr typical).

export default {
  color:            '#0d9488',
  stripe:           'linear-gradient(90deg, #115e59, #2dd4bf)',
  label:            'Appliance Repair',
  docLabel:         'Appliance Repair Services',
  category:         'Service',
  defaultLaborRate: 95,
  laborTitle:       'Appliance Repair Labor',
  licenseNote:      'NASTeC-Certified Appliance Tech',
  scopePlaceholder: 'Describe the appliance repair scope — appliance type and brand (refrigerator, dishwasher, washer, dryer, oven, range), symptom diagnosis, parts replacement, warranty/non-warranty, and service-call fee structure.',
  matLibrary: [
    { id: 'arm1',  desc: 'Refrigerator Compressor',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm2',  desc: 'Washer Drain Pump',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm3',  desc: 'Dryer Heating Element',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm4',  desc: 'Dishwasher Pump Motor',                   qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm5',  desc: 'Oven Igniter / Bake Element',             qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm6',  desc: 'Refrigerator Door Gasket',                qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm7',  desc: 'Washer Drive Belt',                       qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm8',  desc: 'Control Board (Various)',                 qty: 1, unit: 'ea', cost: 0 },
    { id: 'arm9',  desc: 'Misc Appliance Parts',                    qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'are1', desc: 'Multimeter / Test Equipment',         qty: 1, unit: 'day', rate: 0 },
    { id: 'are2', desc: 'Appliance Dolly',                     qty: 1, unit: 'day', rate: 0 },
    { id: 'are3', desc: 'Refrigerant Recovery Set (Sealed Sys)', qty: 1, unit: 'day', rate: 0 },
    { id: 'are4', desc: 'Specialty Driver Bit Set',             qty: 1, unit: 'day', rate: 0 },
    { id: 'are5', desc: 'Diagnostic Cable / Software',          qty: 1, unit: 'day', rate: 0 },
  ],
};
