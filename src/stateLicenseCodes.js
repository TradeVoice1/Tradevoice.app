// ─── STATE CONTRACTOR LICENSE CODES ────────────────────────────────────────
// All 50 states + DC — Residential & Commercial license types and governing boards
// Last updated: April 2026
// Source: State licensing boards, NASCLA, ContractorMatrix

export const STATE_LICENSE_DATA = {
  "Alabama": {
    residential: { required: true, type: "Residential Builder License", threshold: "$10,000+", board: "Alabama Home Builders Licensure Board", website: "hblb.alabama.gov" },
    commercial: { required: true, type: "General Contractor License", threshold: "$100,000+", board: "Alabama Licensing Board for General Contractors", website: "albgc.alabama.gov" },
    notes: "Reciprocity with MS, TN, AR, LA, NC, SC. NASCLA member."
  },
  "Alaska": {
    residential: { required: true, type: "Residential Contractor License (with Residential Endorsement)", threshold: "All projects", board: "Alaska Dept. of Commerce, Community & Economic Development", website: "commerce.alaska.gov" },
    commercial: { required: true, type: "General Contractor License", threshold: "All projects", board: "Alaska Dept. of Commerce, Community & Economic Development", website: "commerce.alaska.gov" },
    notes: "Cold weather construction course required for residential endorsement."
  },
  "Arizona": {
    residential: { required: true, type: "B-1 General Residential Contractor", threshold: "$1,000+", board: "Arizona Registrar of Contractors (AZ ROC)", website: "roc.az.gov" },
    commercial: { required: true, type: "B General Commercial Contractor or KB Dual", threshold: "$1,000+", board: "Arizona Registrar of Contractors (AZ ROC)", website: "roc.az.gov" },
    notes: "NASCLA member. Separate residential and commercial classifications."
  },
  "Arkansas": {
    residential: { required: true, type: "Residential Builder / Home Improvement License", threshold: "$2,000+", board: "Arkansas Contractors Licensing Board", website: "aclb.arkansas.gov" },
    commercial: { required: true, type: "Commercial General Contractor License", threshold: "$50,000+", board: "Arkansas Contractors Licensing Board", website: "aclb.arkansas.gov" },
    notes: "NASCLA member. $10,000 surety bond required for most commercial licenses."
  },
  "California": {
    residential: { required: true, type: "Class B General Building Contractor", threshold: "$1,000+", board: "California Contractors State License Board (CSLB)", website: "cslb.ca.gov" },
    commercial: { required: true, type: "Class B General Building Contractor", threshold: "$1,000+", board: "California Contractors State License Board (CSLB)", website: "cslb.ca.gov" },
    notes: "Same license covers both residential and commercial. 4 years experience required. $25,000 bond."
  },
  "Colorado": {
    residential: { required: false, type: "No state license — local jurisdiction only", threshold: "Varies by city/county", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local jurisdiction only", threshold: "Varies by city/county", board: "Local City/County", website: "N/A" },
    notes: "Check local city or county requirements. No statewide licensing."
  },
  "Connecticut": {
    residential: { required: true, type: "Home Improvement Contractor Registration / New Home Construction Registration", threshold: "All projects", board: "CT Dept. of Consumer Protection", website: "portal.ct.gov/DCP" },
    commercial: { required: true, type: "Major Contractor License", threshold: "All projects", board: "CT Dept. of Consumer Protection", website: "portal.ct.gov/DCP" },
    notes: "Trades licensed separately. Major contractors need bank references and letters of credit."
  },
  "Delaware": {
    residential: { required: true, type: "Home Improvement Contractor License", threshold: "All projects", board: "Delaware Division of Revenue", website: "revenue.delaware.gov" },
    commercial: { required: true, type: "General Contractor License", threshold: "All projects", board: "Delaware Division of Revenue", website: "revenue.delaware.gov" },
    notes: "No exam required. Business registration, insurance, and surety bond needed."
  },
  "Florida": {
    residential: { required: true, type: "Certified Residential Contractor (CRC) or Registered Contractor", threshold: "$500+", board: "FL Dept. of Business & Professional Regulation (DBPR)", website: "myfloridalicense.com" },
    commercial: { required: true, type: "Certified General Contractor (CGC) or Certified Building Contractor (CBC)", threshold: "$500+", board: "FL Dept. of Business & Professional Regulation (DBPR)", website: "myfloridalicense.com" },
    notes: "Certified = statewide. Registered = local jurisdiction only. Fingerprinting required."
  },
  "Georgia": {
    residential: { required: true, type: "Residential Basic Contractor (up to $100K) or General Residential", threshold: "$2,500+", board: "Georgia State Licensing Board for Residential and General Contractors", website: "sos.ga.gov/contractors" },
    commercial: { required: true, type: "General Contractor — Unlimited or Limited ($500K cap)", threshold: "$2,500+", board: "Georgia State Licensing Board for Residential and General Contractors", website: "sos.ga.gov/contractors" },
    notes: "NASCLA member. Tiers: Unlimited, General ($500K cap), Residential Basic ($100K cap)."
  },
  "Hawaii": {
    residential: { required: true, type: "General Building Contractor (B) License", threshold: "$1,000+ or any permitted work", board: "Hawaii DCCA Contractors License Board", website: "cca.hawaii.gov/pvl" },
    commercial: { required: true, type: "General Engineering (A) or General Building (B) License", threshold: "$1,000+ or any permitted work", board: "Hawaii DCCA Contractors License Board", website: "cca.hawaii.gov/pvl" },
    notes: "4 years supervisory experience required. Trade exam + business/law exam. $5,000 surety bond minimum."
  },
  "Idaho": {
    residential: { required: false, type: "Registration with Idaho Contractors Board required", threshold: "All projects", board: "Idaho Contractors Board", website: "dbs.idaho.gov" },
    commercial: { required: false, type: "Registration with Idaho Contractors Board required", threshold: "All projects", board: "Idaho Contractors Board", website: "dbs.idaho.gov" },
    notes: "No state license but registration required. Proof of GL and workers' comp required."
  },
  "Illinois": {
    residential: { required: false, type: "No state license — local jurisdiction only", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local jurisdiction only (Plumbers/Roofers require state license)", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Chicago has its own licensing requirements. Plumbers and roofers need state license."
  },
  "Indiana": {
    residential: { required: false, type: "No state GC license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state GC license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Only plumbers require a state license. Check local jurisdiction requirements."
  },
  "Iowa": {
    residential: { required: false, type: "Registration with Iowa Division of Labor if earning $2,000+/year", threshold: "$2,000/year", board: "Iowa Division of Labor", website: "iwd.iowa.gov" },
    commercial: { required: false, type: "Registration with Iowa Division of Labor if earning $2,000+/year", threshold: "$2,000/year", board: "Iowa Division of Labor", website: "iwd.iowa.gov" },
    notes: "No formal license — registration only. Local requirements may apply."
  },
  "Kansas": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Wichita and Kansas City have local requirements."
  },
  "Kentucky": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Louisville Metro requires contractor registration. Check local jurisdiction."
  },
  "Louisiana": {
    residential: { required: true, type: "Residential Contractor License ($75,000+) or Home Improvement Registration ($7,500–$75,000)", threshold: "$7,500+", board: "Louisiana State Licensing Board for Contractors (LSLBC)", website: "lslbc.louisiana.gov" },
    commercial: { required: true, type: "Commercial General Contractor License", threshold: "$50,000+", board: "Louisiana State Licensing Board for Contractors (LSLBC)", website: "lslbc.louisiana.gov" },
    notes: "NASCLA member. Contracting without a license is a misdemeanor. Business must register with LA Secretary of State."
  },
  "Maine": {
    residential: { required: false, type: "No state GC license — written contract required for jobs over $3,000", threshold: "$3,000+", board: "Maine Dept. of Professional & Financial Regulation", website: "maine.gov/pfr" },
    commercial: { required: false, type: "No state GC license", threshold: "N/A", board: "Maine Dept. of Professional & Financial Regulation", website: "maine.gov/pfr" },
    notes: "Plumbers and electricians require state license. No general contractor state license."
  },
  "Maryland": {
    residential: { required: true, type: "Home Improvement Contractor License", threshold: "$500+", board: "Maryland Home Improvement Commission (MHIC)", website: "dllr.state.md.us/license/mhic" },
    commercial: { required: true, type: "Trade-specific licenses (Electrician, Plumber, HVAC)", threshold: "All projects", board: "Maryland Dept. of Labor", website: "labor.maryland.gov" },
    notes: "Specialty trade licenses may be issued at local level. No general commercial GC state license."
  },
  "Massachusetts": {
    residential: { required: true, type: "Home Improvement Contractor (HIC) Registration", threshold: "All residential projects", board: "MA Office of Consumer Affairs & Business Regulation", website: "mass.gov/hic" },
    commercial: { required: true, type: "Construction Supervisor License (CSL)", threshold: "All projects involving structure", board: "MA Board of Building Regulations & Standards", website: "mass.gov/bbrs" },
    notes: "CSL required for any structural work. HIC for residential improvements."
  },
  "Michigan": {
    residential: { required: true, type: "Residential Builder License or Maintenance & Alteration Contractor", threshold: "All residential construction", board: "Michigan Dept. of Licensing & Regulatory Affairs (LARA)", website: "michigan.gov/lara" },
    commercial: { required: true, type: "Commercial license through LARA", threshold: "All commercial construction", board: "Michigan Dept. of Licensing & Regulatory Affairs (LARA)", website: "michigan.gov/lara" },
    notes: "Separate residential and commercial classifications. Workers' comp + GL required."
  },
  "Minnesota": {
    residential: { required: true, type: "Residential Building Contractor or Residential Remodeler License", threshold: "All residential work (exempt if gross receipts under $15,000 with Certificate of Exemption)", board: "Minnesota Dept. of Labor and Industry", website: "dli.mn.gov" },
    commercial: { required: true, type: "Commercial License through MN Dept. of Labor", threshold: "All commercial construction", board: "Minnesota Dept. of Labor and Industry", website: "dli.mn.gov" },
    notes: "Exempt if gross annual receipts under $15,000 with Certificate of Exemption."
  },
  "Mississippi": {
    residential: { required: true, type: "Residential Contractor License", threshold: "$10,000+ (electrical/plumbing/HVAC under $10K exempt)", board: "Mississippi State Board of Contractors", website: "msboc.us" },
    commercial: { required: true, type: "Commercial General Contractor License", threshold: "$50,000+", board: "Mississippi State Board of Contractors", website: "msboc.us" },
    notes: "NASCLA member. Reciprocity with AL, TN, AR, LA. Residential E/P/HVAC under $10K does not require state license."
  },
  "Missouri": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "St. Louis and Kansas City have local licensing requirements. Check local jurisdiction."
  },
  "Montana": {
    residential: { required: false, type: "No state GC license — registration required if you have employees", threshold: "N/A", board: "Montana Dept. of Labor and Industry", website: "dli.mt.gov" },
    commercial: { required: false, type: "No state GC license — registration required if you have employees", threshold: "N/A", board: "Montana Dept. of Labor and Industry", website: "dli.mt.gov" },
    notes: "Electricians and plumbers require state license. Workers' comp proof required if you have employees."
  },
  "Nebraska": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Omaha and Lincoln have local contractor registration requirements."
  },
  "Nevada": {
    residential: { required: true, type: "B-2 Residential and Small Commercial Contractor or B General Building", threshold: "All projects", board: "Nevada State Contractors Board (NSCB)", website: "nscb.nv.gov" },
    commercial: { required: true, type: "B General Building Contractor", threshold: "All projects", board: "Nevada State Contractors Board (NSCB)", website: "nscb.nv.gov" },
    notes: "NASCLA member. Same license can cover both residential and commercial."
  },
  "New Hampshire": {
    residential: { required: false, type: "No state GC license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state GC license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Some trades require state license."
  },
  "New Jersey": {
    residential: { required: true, type: "Home Improvement Contractor Registration", threshold: "All residential improvement", board: "NJ Division of Consumer Affairs", website: "njconsumeraffairs.gov" },
    commercial: { required: false, type: "No state commercial GC license — local requirements apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "HIC registration required for all residential. No state commercial GC license."
  },
  "New Mexico": {
    residential: { required: true, type: "Residential Contractor License (GB-2)", threshold: "All residential", board: "New Mexico Regulation & Licensing Dept. — Construction Industries Division", website: "rld.state.nm.us/construction" },
    commercial: { required: true, type: "General Building Contractor License (GB-98 or GB-2)", threshold: "All commercial", board: "New Mexico Regulation & Licensing Dept. — Construction Industries Division", website: "rld.state.nm.us/construction" },
    notes: "Multiple license classifications. Exam required."
  },
  "New York": {
    residential: { required: true, type: "Home Improvement Contractor Registration (HICPA)", threshold: "All residential", board: "NY Division of Consumer Protection", website: "dos.ny.gov" },
    commercial: { required: false, type: "Local jurisdiction only (NYC requires separate GC license)", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "NYC requires $50,000 insurance + background check for GC license. No statewide commercial GC license."
  },
  "North Carolina": {
    residential: { required: true, type: "Residential License — Limited ($90K cap), Intermediate ($500K cap), or Unlimited", threshold: "All residential", board: "NC Licensing Board for General Contractors", website: "nclbgc.org" },
    commercial: { required: true, type: "Commercial License — Limited, Intermediate, or Unlimited", threshold: "All commercial", board: "NC Licensing Board for General Contractors", website: "nclbgc.org" },
    notes: "NASCLA member. No surety bond required — $50,000 minimum GL insurance instead. Tiered by project value."
  },
  "North Dakota": {
    residential: { required: true, type: "Residential Contractor License", threshold: "$4,000+", board: "North Dakota Secretary of State", website: "sos.nd.gov" },
    commercial: { required: true, type: "General Contractor License", threshold: "$4,000+", board: "North Dakota Secretary of State", website: "sos.nd.gov" },
    notes: "One of the lowest thresholds in the country at $4,000."
  },
  "Ohio": {
    residential: { required: false, type: "No state license — local requirements apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Columbus, Cleveland, Cincinnati all require local contractor registration. No statewide GC license."
  },
  "Oklahoma": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "Oklahoma City and Tulsa have local requirements. Check local jurisdiction."
  },
  "Oregon": {
    residential: { required: true, type: "Residential Contractor License (CCB)", threshold: "All residential", board: "Oregon Construction Contractors Board (CCB)", website: "oregon.gov/ccb" },
    commercial: { required: true, type: "Commercial Contractor License (CCB) or Dual Endorsement", threshold: "All commercial", board: "Oregon Construction Contractors Board (CCB)", website: "oregon.gov/ccb" },
    notes: "NASCLA member. 16-hour prelicense training + state exam required. $400 application fee (July 2025). $15K–$25K surety bond."
  },
  "Pennsylvania": {
    residential: { required: true, type: "Home Improvement Contractor Registration (HICPA)", threshold: "All residential improvement", board: "PA Office of Attorney General", website: "attorneygeneral.gov" },
    commercial: { required: false, type: "No state commercial GC license — Philadelphia requires local license", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "HICPA registration required for all residential. Philadelphia requires separate commercial GC license."
  },
  "Rhode Island": {
    residential: { required: true, type: "Contractor Registration", threshold: "All residential", board: "RI Contractors' Registration & Licensing Board", website: "crb.ri.gov" },
    commercial: { required: true, type: "Contractor Registration", threshold: "All commercial", board: "RI Contractors' Registration & Licensing Board", website: "crb.ri.gov" },
    notes: "Single registration covers both residential and commercial."
  },
  "South Carolina": {
    residential: { required: true, type: "Residential Builder License (RBC)", threshold: "All residential new construction", board: "SC Residential Builders Commission", website: "llr.sc.gov/rbc" },
    commercial: { required: true, type: "General Contractor License (CLB)", threshold: "$5,000+", board: "SC Contractors Licensing Board (CLB)", website: "llr.sc.gov/clb" },
    notes: "NASCLA member. Separate boards for residential (RBC) and commercial (CLB)."
  },
  "South Dakota": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Sioux Falls has local contractor registration requirements."
  },
  "Tennessee": {
    residential: { required: true, type: "Residential Contractor License", threshold: "$3,000+", board: "TN Board for Licensing Contractors", website: "tn.gov/commerce/boards/contractors" },
    commercial: { required: true, type: "Commercial General Contractor License", threshold: "$25,000+", board: "TN Board for Licensing Contractors", website: "tn.gov/commerce/boards/contractors" },
    notes: "NASCLA member. Reciprocity with AL, AR, MS, GA, LA, NC, SC, VA, W. VA."
  },
  "Texas": {
    residential: { required: false, type: "No state license — local requirements apply (city/county)", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements apply (city/county)", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Dallas, Houston, Austin, San Antonio all have local licensing. Electricians, plumbers, and HVAC require state license."
  },
  "Utah": {
    residential: { required: true, type: "Residential/Small Commercial Contractor License (B100)", threshold: "All residential", board: "Utah Division of Occupational & Professional Licensing (DOPL)", website: "dopl.utah.gov" },
    commercial: { required: true, type: "General Contractor License (B) or Specialty", threshold: "All commercial", board: "Utah Division of Occupational & Professional Licensing (DOPL)", website: "dopl.utah.gov" },
    notes: "NASCLA member. Multiple classification types."
  },
  "Vermont": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Burlington has local requirements."
  },
  "Virginia": {
    residential: { required: true, type: "Class A (over $120K), Class B ($10K–$120K), or Class C (up to $10K)", threshold: "$1,000+", board: "VA Dept. of Professional & Occupational Regulation (DPOR)", website: "dpor.virginia.gov" },
    commercial: { required: true, type: "Class A (over $120K), Class B ($10K–$120K), or Class C (up to $10K)", threshold: "$1,000+", board: "VA Dept. of Professional & Occupational Regulation (DPOR)", website: "dpor.virginia.gov" },
    notes: "NASCLA member. Same tiered classification covers both residential and commercial. Class A requires surety bond."
  },
  "Washington": {
    residential: { required: true, type: "General Contractor Registration (with Residential Endorsement for residential work)", threshold: "$10,000+ residential", board: "WA Dept. of Labor & Industries", website: "lni.wa.gov" },
    commercial: { required: true, type: "General Contractor Registration", threshold: "All commercial", board: "WA Dept. of Labor & Industries", website: "lni.wa.gov" },
    notes: "$30,000 surety bond required. 8-hour energy code course for residential endorsement."
  },
  "West Virginia": {
    residential: { required: true, type: "Contractor License", threshold: "All residential", board: "WV Division of Labor — Contractor Licensing Section", website: "labor.wv.gov" },
    commercial: { required: true, type: "Contractor License", threshold: "All commercial", board: "WV Division of Labor — Contractor Licensing Section", website: "labor.wv.gov" },
    notes: "NASCLA member. $10,000–$50,000 surety bond depending on classification."
  },
  "Wisconsin": {
    residential: { required: true, type: "Dwelling Contractor Qualifier (DCQ) Certification", threshold: "All residential construction", board: "WI Dept. of Safety & Professional Services (DSPS)", website: "dsps.wi.gov" },
    commercial: { required: false, type: "No state commercial GC license — local requirements apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "DCQ required for residential. No statewide commercial GC license."
  },
  "Wyoming": {
    residential: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    commercial: { required: false, type: "No state license — local requirements may apply", threshold: "Varies", board: "Local City/County", website: "N/A" },
    notes: "No statewide GC license. Check local jurisdiction."
  },
  "Washington D.C.": {
    residential: { required: true, type: "Home Improvement Contractor License", threshold: "All residential", board: "DC Dept. of Consumer & Regulatory Affairs (DCRA)", website: "dcra.dc.gov" },
    commercial: { required: true, type: "General Contractor License", threshold: "All commercial", board: "DC Dept. of Consumer & Regulatory Affairs (DCRA)", website: "dcra.dc.gov" },
    notes: "DC has its own licensing separate from Maryland and Virginia."
  }
};

// Quick lookup helper — get license info for a state and work type
export const getLicenseInfo = (state, workType = 'residential') => {
  const data = STATE_LICENSE_DATA[state];
  if (!data) return null;
  return workType === 'commercial' ? data.commercial : data.residential;
};

// Get all states that require a license for a given work type
export const getStatesRequiringLicense = (workType = 'residential') => {
  return Object.entries(STATE_LICENSE_DATA)
    .filter(([, data]) => data[workType]?.required)
    .map(([state]) => state);
};

export default STATE_LICENSE_DATA;
