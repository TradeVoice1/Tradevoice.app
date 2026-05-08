// Snow Removal — plowing, salting, sidewalk clearing, seasonal contracts.
// Reference: SIMA (Snow & Ice Management Assoc.) Best Practices.
// Labor rate per BLS 37-3019 ($75/hr typical, plus equipment).

export default {
  color:            '#0c4a6e',
  stripe:           'linear-gradient(90deg, #075985, #38bdf8)',
  label:            'Snow Removal',
  docLabel:         'Snow Removal Services',
  category:         'Service',
  defaultLaborRate: 75,
  laborTitle:       'Snow Removal Labor',
  licenseNote:      'Insured Snow Removal Contractor',
  scopePlaceholder: 'Describe the snow removal scope — service trigger (per push, per inch, per visit, seasonal contract), property (driveway sf, parking lot sf, sidewalk lf), salt/de-icer included, response time SLA.',
  matLibrary: [
    { id: 'snm1', desc: 'Rock Salt (Per Ton)',                      qty: 1, unit: 'ton',cost: 0 },
    { id: 'snm2', desc: 'Calcium Chloride Pellets (50lb)',           qty: 1, unit: 'bag',cost: 0 },
    { id: 'snm3', desc: 'Liquid De-Icer (Per Gallon)',               qty: 1, unit: 'gal',cost: 0 },
    { id: 'snm4', desc: 'Misc Snow Supplies',                        qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'sne1', desc: 'Truck w/ Plow Blade',                qty: 1, unit: 'day', rate: 0 },
    { id: 'sne2', desc: 'Skid Steer w/ Snow Pusher',           qty: 1, unit: 'day', rate: 0 },
    { id: 'sne3', desc: 'Salt Spreader (Tailgate)',            qty: 1, unit: 'day', rate: 0 },
    { id: 'sne4', desc: 'Snow Blower (Walk-Behind)',           qty: 1, unit: 'day', rate: 0 },
    { id: 'sne5', desc: 'Liquid De-Ice Sprayer',               qty: 1, unit: 'day', rate: 0 },
    { id: 'sne6', desc: 'Loader w/ Snow Bucket',               qty: 1, unit: 'day', rate: 0 },
  ],
};
