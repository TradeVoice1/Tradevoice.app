// Bundle — virtual "Multi-Trade Job" config used when a quote spans multiple
// trades (e.g. plumbing + electrical + HVAC for a remodel). The libraries
// are dynamically composed from whatever trades the user actually offers,
// so a Plumber+Electrician sees ~24 quick-add items instead of all 50+
// trades' worth.

export default {
  color:            '#2d6a4f',
  stripe:           'linear-gradient(90deg, #2563eb 0%, #0891b2 25%, #b45309 50%, #16a34a 75%, #2d6a4f 100%)',
  label:            'Multi-Trade',
  docLabel:         'Multi-Trade Services',
  category:         'Multi-Trade',
  defaultLaborRate: 100,
  laborTitle:       'Labor',
  licenseNote:      'Licensed & Insured',
  scopePlaceholder: 'Describe the full scope of work across all trades required for this project. List each discipline involved (plumbing, electrical, HVAC, etc.) and what falls under each.',
  matLibrary: [],
  equipLibrary: [],
};
