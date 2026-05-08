// Security / Alarm — burglar alarms, surveillance cameras, access control, monitoring.
// Reference: NICET certification, UL 681/1023/1076, NEC Article 725.
// Labor rate per BLS 49-2098 ($95/hr typical).

export default {
  color:            '#991b1b',
  stripe:           'linear-gradient(90deg, #7f1d1d, #ef4444)',
  label:            'Security / Alarm',
  docLabel:         'Security & Alarm Services',
  category:         'Construction',
  defaultLaborRate: 95,
  laborTitle:       'Security Labor',
  licenseNote:      'Licensed Alarm/Security Installer (NICET)',
  scopePlaceholder: 'Describe the security scope — system type (intrusion, fire, surveillance, access control), number of zones/cameras/doors, monitoring service (central station UL listed), wireless vs hardwired, smart-home integration, and warranty/monitoring contract terms.',
  matLibrary: [
    { id: 'scm1',  desc: 'Alarm Control Panel (Honeywell/DSC)',     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm2',  desc: 'Wireless Door/Window Sensor',              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm3',  desc: 'Motion Detector PIR',                      qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm4',  desc: 'Glass Break Detector',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm5',  desc: 'Keypad LCD',                              qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm6',  desc: 'Indoor / Outdoor Siren',                   qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm7',  desc: '4MP IP Bullet Camera',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm8',  desc: '4MP IP Dome Camera',                       qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm9',  desc: '8-Channel NVR w/ 2TB',                     qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm10', desc: 'Access Control Reader (Card)',             qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm11', desc: 'Electric Strike / Maglock',                qty: 1, unit: 'ea',  cost: 0 },
    { id: 'scm12', desc: 'Misc Cabling & Hardware',                  qty: 1, unit: 'lot', cost: 0 },
  ],
  equipLibrary: [
    { id: 'sce1', desc: 'Cable Pulling Set + Fish Tape',      qty: 1, unit: 'day', rate: 0 },
    { id: 'sce2', desc: 'PoE Network Tester',                  qty: 1, unit: 'day', rate: 0 },
    { id: 'sce3', desc: 'Punch-Down / Crimp Tools',            qty: 1, unit: 'day', rate: 0 },
    { id: 'sce4', desc: 'Borescope / Wall Inspection Camera',  qty: 1, unit: 'day', rate: 0 },
    { id: 'sce5', desc: 'Access Control Programming Cable',     qty: 1, unit: 'day', rate: 0 },
    { id: 'sce6', desc: 'Step Ladder / Mini-Lift',              qty: 1, unit: 'day', rate: 0 },
  ],
};
