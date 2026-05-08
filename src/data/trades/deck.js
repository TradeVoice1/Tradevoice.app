// Deck / Patio — wood, composite, PVC decks, screen porches, pergolas, paver patios.
// Reference: IRC chapter 5 (decks), AWPA Standards (treated lumber), DCA-6 NADRA.
// Labor rate per BLS 47-2031 ($75/hr typical).

export default {
  color:            '#a16207',
  stripe:           'linear-gradient(90deg, #92400e, #d97706)',
  label:            'Deck / Patio',
  docLabel:         'Deck & Patio Services',
  category:         'Construction',
  defaultLaborRate: 75,
  laborTitle:       'Deck Labor',
  licenseNote:      'Deck Contractor — Licensed & Insured',
  scopePlaceholder: 'Describe the deck/patio scope — square footage, deck height, material (PT lumber, cedar, composite, PVC), post and footing details, railing system, stairs, structural framing (joists, beams, ledger), permits, and any electrical/lighting included.',
  matLibrary: [
    { id: 'dkm1',  desc: 'PT 2x8x12 Joist',                          qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm2',  desc: 'PT 2x10x12 Joist',                         qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm3',  desc: 'PT 4x4x10 Post',                            qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm4',  desc: 'PT 6x6x10 Post',                            qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm5',  desc: '5/4x6 PT Decking 12ft',                    qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm6',  desc: 'Composite Decking 12ft (Trex/TimberTech)', qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm7',  desc: 'Composite Railing System (Lin Ft)',         qty: 1, unit: 'lf', cost: 0 },
    { id: 'dkm8',  desc: 'Joist Hangers (Each)',                      qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm9',  desc: 'Ledger Bolts / Screws (Lot)',                qty: 1, unit: 'lot',cost: 0 },
    { id: 'dkm10', desc: 'Concrete Footing 60lb Bag',                  qty: 1, unit: 'bag',cost: 0 },
    { id: 'dkm11', desc: 'Post Anchor Bracket',                        qty: 1, unit: 'ea', cost: 0 },
    { id: 'dkm12', desc: 'Hidden Deck Fasteners (Box, ~50sf)',         qty: 1, unit: 'box',cost: 0 },
    { id: 'dkm13', desc: 'Flashing Tape for Ledger (Roll)',            qty: 1, unit: 'roll',cost: 0 },
    { id: 'dkm14', desc: 'Misc Deck Hardware',                          qty: 1, unit: 'lot',cost: 0 },
  ],
  equipLibrary: [
    { id: 'dke1', desc: 'Post Hole Auger',                   qty: 1, unit: 'day', rate: 0 },
    { id: 'dke2', desc: 'Miter Saw (12" Sliding)',            qty: 1, unit: 'day', rate: 0 },
    { id: 'dke3', desc: 'Framing Nail Gun + Compressor',      qty: 1, unit: 'day', rate: 0 },
    { id: 'dke4', desc: 'Concrete Mixer (Footings)',          qty: 1, unit: 'day', rate: 0 },
    { id: 'dke5', desc: 'Laser Level',                        qty: 1, unit: 'day', rate: 0 },
    { id: 'dke6', desc: 'Skid Steer / Mini-Ex Rental',         qty: 1, unit: 'day', rate: 0 },
  ],
};
