// Verifies src/lib/rateMath.js against a real industrial T&M bid workbook.
// Every expected value below was read directly out of the spreadsheet
// (Direct Labor / Indirect Labor / Project Rate Sheet tabs) — this test is
// the contract that the app's math matches the paper it was modeled on.
//
// Run: node scripts/test-rate-math.mjs

import {
  burdenSum, stRate, otRate, dtRate, groupComposite, projectComposite,
} from '../src/lib/rateMath.js';

const mkLines = (gl) => [
  { name: 'FICA',                      pct: 6.20,  appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: 'Medicare',                  pct: 1.45,  appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: 'SUI',                       pct: 2.09,  appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: 'FUI',                       pct: 0.60,  appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: "Workman's comp",            pct: 1.28,  appliesSt: true, appliesOt: false, appliesDt: false },
  { name: 'General liability',         pct: gl,    appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: 'Health / fringes',          pct: 16.00, appliesSt: true, appliesOt: true,  appliesDt: true  },
  { name: 'Safety & PPE',              pct: 5.25,  appliesSt: true, appliesOt: false, appliesDt: false },
  { name: 'Small tools & consumables', pct: 10.00, appliesSt: true, appliesOt: false, appliesDt: false },
  { name: 'State / city / local tax',  pct: 0,     appliesSt: true, appliesOt: true,  appliesDt: true  },
];

const direct = {
  ohSt: 10, ohOt: 0, ohDt: 0, profitSt: 15, profitOt: 10, profitDt: 10,
  lines: mkLines(8.25),
  crafts: [
    { name: 'Foreman I',            wage: 44, qty: 1, stHours: 40, otHours: 10, dtHours: 0 },
    { name: 'Mechanical Craftsman', wage: 38, qty: 1, stHours: 40, otHours: 10, dtHours: 0 },
  ],
};

const indirect = {
  ohSt: 10, ohOt: 0, ohDt: 0, profitSt: 15, profitOt: 10, profitDt: 10,
  lines: mkLines(8.33),
  crafts: [85, 54, 54, 52, 48, 55, 33, 34, 36].map((w, i) => ({
    name: `pos${i}`, wage: w, qty: 1, stHours: 40, otHours: 10, dtHours: 0,
  })),
};

let pass = 0, fail = 0;
const r4 = (x) => Math.round(x * 10000) / 10000;
// Workbook cells store floats with their own dust; match to a tenth of a cent.
const check = (label, got, want, tol = 0.0005) => {
  const ok = Math.abs(got - want) <= tol;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${r4(got)} want=${want}`);
};

// ── Burden sums (workbook B15 / B34) ──
check('direct S.T. burden %', burdenSum(direct.lines, 'st'), 51.12);
check('direct O.T. burden %', burdenSum(direct.lines, 'ot'), 34.59);

// ── Direct rates (Direct Labor tab rows 21 & 42) ──
check('Foreman I ST',        stRate(direct, 44), 77.4928);
check('Foreman I OT',        otRate(direct, 44), 109.3026);
check('Mech Craftsman ST',   stRate(direct, 38), 66.9256);
check('Mech Craftsman OT',   otRate(direct, 38), 94.3977);
check('Helper ST',           stRate(direct, 32), 56.3584);
check('Labor/Firewatch OT',  otRate(direct, 26), 64.5879);

// ── Indirect rates (Indirect Labor tab; GL 8.33) ──
check('PM ST',        stRate(indirect, 85), 149.77);
check('PM OT',        otRate(indirect, 85), 211.2547);
check('Supt ST',      stRate(indirect, 54), 95.148);
check('Supt OT',      otRate(indirect, 54), 134.2089);
check('Clerical ST',  stRate(indirect, 33), 58.146);
check('Safety OT',    otRate(indirect, 52), 129.2382);

// ── Double time: ST + a full premium portion ──
check('Foreman I DT', dtRate(direct, 44), stRate(direct, 44) + 2 * (otRate(direct, 44) - stRate(direct, 44)));

// ── Composites (Direct Labor rows 52-55; Indirect blended D74-76) ──
const dc = groupComposite(direct);
check('crew hours',            dc.hours,   100);
check('crew $ / week',         dc.dollars, 7813.739);
check('direct composite',      dc.rate,    78.13739);
check('composite w/ per diem', dc.rate + 137.5 / 10, 91.88739);

const pc = projectComposite([direct, indirect]);
check('project hours',     pc.hours,   550);
check('project $',         pc.dollars, 50809.1475);
check('project composite', pc.rate,    92.3803, 0.0001);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
