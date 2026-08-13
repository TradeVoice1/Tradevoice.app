// Rate-system math engine. Pure functions, no imports — unit-tested in
// scripts/test-rate-math.mjs against the Burkes Bid Form_2026 workbook,
// which this reproduces to the penny.
//
// The one rule that matters: percentages are taken ON THE BASE WAGE and
// SUMMED — additive, never compounded. 44 × (1 + (51.12+10+15)/100) = 77.4928.
// Compounding the same inputs gives 83.11; that difference is a phantom
// $6/hr, which is why this file is the only place rates are computed.
//
// Portions: straight time carries the full wage. Overtime adds a HALF
// portion, double time adds a FULL portion — each with its own burden
// subset (applies_ot / applies_dt per line) and its own overhead/profit.

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Sum of burden percents applying to one portion: 'st' | 'ot' | 'dt'. */
export function burdenSum(lines, portion) {
  const key = { st: 'appliesSt', ot: 'appliesOt', dt: 'appliesDt' }[portion];
  return (lines || []).reduce((s, l) => s + (l[key] ? n(l.pct) : 0), 0);
}

/** Straight-time billing rate for one wage within a group. */
export function stRate(group, wage) {
  return n(wage) * (1 + (burdenSum(group.lines, 'st') + n(group.ohSt) + n(group.profitSt)) / 100);
}

/** The OT adder: half the wage, built up with the OT burden set. */
export function otAdder(group, wage) {
  return (n(wage) * 0.5) * (1 + (burdenSum(group.lines, 'ot') + n(group.ohOt) + n(group.profitOt)) / 100);
}

/** The DT adder: a full wage portion, built up with the DT burden set. */
export function dtAdder(group, wage) {
  return n(wage) * (1 + (burdenSum(group.lines, 'dt') + n(group.ohDt) + n(group.profitDt)) / 100);
}

export function otRate(group, wage) { return stRate(group, wage) + otAdder(group, wage); }
export function dtRate(group, wage) { return stRate(group, wage) + dtAdder(group, wage); }

/** All three rates for every craft in a group. */
export function craftRates(group) {
  return (group.crafts || []).map((c) => ({
    ...c,
    st: stRate(group, c.wage),
    ot: otRate(group, c.wage),
    dt: dtRate(group, c.wage),
  }));
}

/**
 * Manpower composite for one group: Σ(qty × hrs × rate) ÷ Σ(qty × hrs).
 * Returns { hours, dollars, rate }.
 */
export function groupComposite(group) {
  let hours = 0, dollars = 0;
  (group.crafts || []).forEach((c) => {
    const qty = n(c.qty);
    if (!qty) return;
    hours   += qty * (n(c.stHours) + n(c.otHours) + n(c.dtHours));
    dollars += qty * (
      n(c.stHours) * stRate(group, c.wage) +
      n(c.otHours) * otRate(group, c.wage) +
      n(c.dtHours) * dtRate(group, c.wage)
    );
  });
  return { hours, dollars, rate: hours ? dollars / hours : 0 };
}

/** Blended project composite across all groups (direct + indirect). */
export function projectComposite(groups) {
  let hours = 0, dollars = 0;
  (groups || []).forEach((g) => {
    const c = groupComposite(g);
    hours += c.hours; dollars += c.dollars;
  });
  return { hours, dollars, rate: hours ? dollars / hours : 0 };
}

/** Per diem as an hourly adder on the composite: billed ÷ hours per day. */
export function perDiemHourly(sheet) {
  const hrs = n(sheet.perDiemHoursPerDay) || 10;
  return n(sheet.perDiemDaily) / hrs;
}
