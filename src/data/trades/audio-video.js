// Audio / Video — home theater, distributed audio, smart home, TV mounting, structured AV.
// Reference: CEDIA Best Practices, EIA/TIA cabling, AVIXA (audiovisual integration).
// Labor rate per BLS 49-2097 ($95/hr typical, CEDIA-certified installer).

export default {
  color:            '#7e22ce',
  stripe:           'linear-gradient(90deg, #6b21a8, #a855f7)',
  label:            'Audio / Video',
  docLabel:         'Audio Visual Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'AV Labor',
  licenseNote:      'CEDIA-Certified AV Installer',
  scopePlaceholder: 'Describe the AV scope — home theater design, TV mounting, in-ceiling/wall speakers, distributed audio (whole-home), smart-home control (Control4, Crestron, Lutron), networking integration, and source equipment provided vs supplied.',
  matLibrary: [
    { id: 'avm1',  desc: '8K Receiver (Denon/Marantz)',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm2',  desc: 'In-Ceiling Speaker Pair',                  qty: 1, unit: 'pr', cost: 0 },
    { id: 'avm3',  desc: 'Subwoofer 12"',                            qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm4',  desc: 'TV Wall Mount Articulating (Up to 75")',  qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm5',  desc: 'HDMI 2.1 Cable 25ft',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm6',  desc: 'HDBaseT Extender Set',                     qty: 1, unit: 'set', cost: 0 },
    { id: 'avm7',  desc: 'Speaker Wire 14/4 (Per Lin Ft)',           qty: 1, unit: 'lf',  cost: 0 },
    { id: 'avm8',  desc: 'Smart Hub (Control4/Hub Pro)',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm9',  desc: 'Lutron Caseta Switch',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm10', desc: 'Sonos Amp Streaming',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm11', desc: 'Universal Remote Programmer',               qty: 1, unit: 'ea',  cost: 0 },
    { id: 'avm12', desc: 'Misc AV Hardware',                          qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'ave1', desc: 'Cable Pulling Kit',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'ave2', desc: 'Stud Finder / Laser Level',           qty: 1, unit: 'day', rate: 0 },
    { id: 'ave3', desc: 'TV Lift / Wall Anchor Kit',           qty: 1, unit: 'day', rate: 0 },
    { id: 'ave4', desc: 'Audio / RTA Test Set',                qty: 1, unit: 'day', rate: 0 },
    { id: 'ave5', desc: 'HDMI Tester / Signal Analyzer',       qty: 1, unit: 'day', rate: 0 },
    { id: 'ave6', desc: 'Wire Fish / Glow Rods',               qty: 1, unit: 'day', rate: 0 },
  ],
};
