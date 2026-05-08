// Mobile Auto Detailing — interior, exterior, paint correction, ceramic coating.
// Reference: IDA (International Detailing Association) Best Practices.
// Labor rate per BLS 53-7061 ($65/hr typical).

export default {
  color:            '#0f172a',
  stripe:           'linear-gradient(90deg, #1e293b, #475569)',
  label:            'Mobile Auto Detailing',
  docLabel:         'Mobile Auto Detailing',
  category:         'Service',
  defaultLaborRate: 65,
  laborTitle:       'Detailing Labor',
  licenseNote:      'IDA-Certified Detailer — Insured',
  scopePlaceholder: 'Describe the detailing scope — vehicle type and size (sedan, SUV, truck), interior/exterior package (basic wash, full detail, paint correction, ceramic coating), level of paint correction (1-step, 2-step), and any specific concerns (pet hair, stains, oxidation).',
  matLibrary: [
    { id: 'mam1', desc: 'Carwash Soap (Gallon)',                    qty: 1, unit: 'gal',cost: 0 },
    { id: 'mam2', desc: 'Iron Decontamination (32oz)',              qty: 1, unit: 'ea', cost: 0 },
    { id: 'mam3', desc: 'Clay Bar Kit',                              qty: 1, unit: 'kit',cost: 0 },
    { id: 'mam4', desc: 'Polishing Compound',                        qty: 1, unit: 'ea', cost: 0 },
    { id: 'mam5', desc: 'Ceramic Coating (50ml)',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'mam6', desc: 'Microfiber Towels (12-pack)',                qty: 1, unit: 'pk', cost: 0 },
    { id: 'mam7', desc: 'Tire Shine (Gallon)',                        qty: 1, unit: 'gal',cost: 0 },
    { id: 'mam8', desc: 'Glass Cleaner (Gallon)',                     qty: 1, unit: 'gal',cost: 0 },
    { id: 'mam9', desc: 'Misc Detailing Supplies',                    qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'mae1', desc: 'Mobile Wash Trailer w/ Tank',         qty: 1, unit: 'day', rate: 0 },
    { id: 'mae2', desc: 'Pressure Washer (Cold)',              qty: 1, unit: 'day', rate: 0 },
    { id: 'mae3', desc: 'Steam Cleaner',                       qty: 1, unit: 'day', rate: 0 },
    { id: 'mae4', desc: 'Polisher (DA / Rotary)',              qty: 1, unit: 'day', rate: 0 },
    { id: 'mae5', desc: 'Wet/Dry Vac',                         qty: 1, unit: 'day', rate: 0 },
    { id: 'mae6', desc: 'Generator (Mobile Power)',            qty: 1, unit: 'day', rate: 0 },
  ],
};
