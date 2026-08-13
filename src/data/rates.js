// Rate system — sheets, build-up groups, burden lines, crafts, equipment.
// All access is owner-scoped via RLS (migration 0043). The browser writes
// directly; Supabase enforces owner_id = auth.uid() on every mutation.
//
// Templates are CLIENT-SIDE constants that insert rows at sheet creation.
// Nothing in the database is product-owned: after creation the owner owns
// every line — rename, reprice, retoggle, delete, or add ones we never
// thought of. That is the product's core rule (no fixed burden list).

import { supabase } from "../supabase";

// ── Row mappers ──────────────────────────────────────────────────────────────

const dbToSheet = (r) => ({
  id:                 r.id,
  name:               r.name ?? '',
  clientId:           r.client_id ?? null,
  projectRef:         r.project_ref ?? '',
  effectiveOn:        r.effective_on ?? null,
  revision:           r.revision ?? '',
  parentId:           r.parent_id ?? null,
  isDefault:          r.is_default === true,
  status:             r.status ?? 'draft',
  perDiemDaily:       r.per_diem_daily   != null ? Number(r.per_diem_daily)   : null,
  perDiemPaid:        r.per_diem_paid    != null ? Number(r.per_diem_paid)    : null,
  perDiemWeekly:      r.per_diem_weekly  != null ? Number(r.per_diem_weekly)  : null,
  perDiemHoursPerDay: r.per_diem_hours_per_day != null ? Number(r.per_diem_hours_per_day) : 10,
  markupMaterials:    r.markup_materials != null ? Number(r.markup_materials) : 10,
  markupSubs:         r.markup_subs      != null ? Number(r.markup_subs)      : 10,
  markupRentals:      r.markup_rentals   != null ? Number(r.markup_rentals)   : 10,
  markupSpecialty:    r.markup_specialty != null ? Number(r.markup_specialty) : 10,
  terms:              Array.isArray(r.terms) ? r.terms : [],
  notes:              r.notes ?? '',
  createdAt:          r.created_at ?? null,
});

const sheetToDb = (s) => ({
  name:                   (s.name || '').trim() || 'Untitled sheet',
  client_id:              s.clientId || null,
  project_ref:            s.projectRef || null,
  effective_on:           s.effectiveOn || null,
  revision:               s.revision || null,
  parent_id:              s.parentId || null,
  is_default:             s.isDefault === true,
  status:                 s.status || 'draft',
  per_diem_daily:         s.perDiemDaily   != null && s.perDiemDaily   !== '' ? Number(s.perDiemDaily)   : null,
  per_diem_paid:          s.perDiemPaid    != null && s.perDiemPaid    !== '' ? Number(s.perDiemPaid)    : null,
  per_diem_weekly:        s.perDiemWeekly  != null && s.perDiemWeekly  !== '' ? Number(s.perDiemWeekly)  : null,
  per_diem_hours_per_day: s.perDiemHoursPerDay != null && s.perDiemHoursPerDay !== '' ? Number(s.perDiemHoursPerDay) : 10,
  markup_materials:       s.markupMaterials != null ? Number(s.markupMaterials) : 10,
  markup_subs:            s.markupSubs      != null ? Number(s.markupSubs)      : 10,
  markup_rentals:         s.markupRentals   != null ? Number(s.markupRentals)   : 10,
  markup_specialty:       s.markupSpecialty != null ? Number(s.markupSpecialty) : 10,
  terms:                  Array.isArray(s.terms) ? s.terms : [],
  notes:                  s.notes || null,
  updated_at:             new Date().toISOString(),
});

const dbToGroup = (r) => ({
  id: r.id, sheetId: r.sheet_id, name: r.name ?? '', sortOrder: r.sort_order ?? 0,
  ohSt:     r.oh_st     != null ? Number(r.oh_st)     : 0,
  ohOt:     r.oh_ot     != null ? Number(r.oh_ot)     : 0,
  ohDt:     r.oh_dt     != null ? Number(r.oh_dt)     : 0,
  profitSt: r.profit_st != null ? Number(r.profit_st) : 0,
  profitOt: r.profit_ot != null ? Number(r.profit_ot) : 0,
  profitDt: r.profit_dt != null ? Number(r.profit_dt) : 0,
});

const groupToDb = (g) => ({
  name: (g.name || '').trim() || 'Build-up', sort_order: g.sortOrder ?? 0,
  oh_st: Number(g.ohSt) || 0, oh_ot: Number(g.ohOt) || 0, oh_dt: Number(g.ohDt) || 0,
  profit_st: Number(g.profitSt) || 0, profit_ot: Number(g.profitOt) || 0, profit_dt: Number(g.profitDt) || 0,
  updated_at: new Date().toISOString(),
});

const dbToLine = (r) => ({
  id: r.id, groupId: r.group_id, name: r.name ?? '',
  pct: r.pct != null ? Number(r.pct) : 0,
  appliesSt: r.applies_st !== false, appliesOt: r.applies_ot !== false, appliesDt: r.applies_dt !== false,
  sortOrder: r.sort_order ?? 0,
});

const lineToDb = (l) => ({
  name: l.name ?? '', pct: Number(l.pct) || 0,
  applies_st: l.appliesSt !== false, applies_ot: l.appliesOt !== false, applies_dt: l.appliesDt !== false,
  sort_order: l.sortOrder ?? 0, updated_at: new Date().toISOString(),
});

const dbToCraft = (r) => ({
  id: r.id, groupId: r.group_id, name: r.name ?? '', definition: r.definition ?? '',
  wage: r.wage != null ? Number(r.wage) : 0,
  qty: r.qty != null ? Number(r.qty) : 0,
  stHours: r.st_hours != null ? Number(r.st_hours) : 40,
  otHours: r.ot_hours != null ? Number(r.ot_hours) : 10,
  dtHours: r.dt_hours != null ? Number(r.dt_hours) : 0,
  sortOrder: r.sort_order ?? 0,
});

const craftToDb = (c) => ({
  name: c.name ?? '', definition: c.definition || null,
  wage: Number(c.wage) || 0, qty: Number(c.qty) || 0,
  st_hours: Number(c.stHours) || 0, ot_hours: Number(c.otHours) || 0, dt_hours: Number(c.dtHours) || 0,
  sort_order: c.sortOrder ?? 0, updated_at: new Date().toISOString(),
});

const dbToEquip = (r) => ({
  id: r.id, sheetId: r.sheet_id, name: r.name ?? '', note: r.note ?? '',
  hourly:  r.hourly  != null ? Number(r.hourly)  : null,
  daily:   r.daily   != null ? Number(r.daily)   : null,
  weekly:  r.weekly  != null ? Number(r.weekly)  : null,
  monthly: r.monthly != null ? Number(r.monthly) : null,
  sortOrder: r.sort_order ?? 0,
});

const equipToDb = (e) => ({
  name: e.name ?? '', note: e.note || null,
  hourly:  e.hourly  != null && e.hourly  !== '' ? Number(e.hourly)  : null,
  daily:   e.daily   != null && e.daily   !== '' ? Number(e.daily)   : null,
  weekly:  e.weekly  != null && e.weekly  !== '' ? Number(e.weekly)  : null,
  monthly: e.monthly != null && e.monthly !== '' ? Number(e.monthly) : null,
  sort_order: e.sortOrder ?? 0, updated_at: new Date().toISOString(),
});

// ── Starter templates ────────────────────────────────────────────────────────
// Each inserts rows at creation and is never consulted again. The
// 'industrial' numbers are the Burkes Bid Form_2026 values this feature was
// verified against; they are a STARTING POINT for the owner to edit, not a
// recommendation.

const STD_TERMS = [
  'Overtime is any hours after 10 on Monday through Thursday, and all hours Friday, Saturday and Sunday.',
  'Holidays bill at double time — New Year’s, Easter, July 4, Labor Day, Thanksgiving, Christmas Eve and Christmas Day.',
  'Rates include hand tools and safety equipment, generally anything under $1,000.00. Tools $1,000.00 or more bill at current AED rates.',
  'Minimum charge of 10 hours per employee. Employees working 12 hours or more per day are paid for all hours including lunch.',
  'Emergency call-in: after hours Mon–Thu at overtime with rollover pay; daytime Fri–Sun at overtime; nights Fri–Sun at double time. Billed from the time the employee leaves home until they return.',
  'Company equipment bills per the current Equipment Rental Rate Schedule.',
  'Invoice terms NET 30. Accounts over 30 days are charged 1.5%.',
];

const line = (name, pct, st = true, ot = true, dt = true) =>
  ({ name, pct, appliesSt: st, appliesOt: ot, appliesDt: dt });

const industrialLines = (gl) => [
  line('FICA', 6.20), line('Medicare', 1.45), line('SUI', 2.09), line('FUI', 0.60),
  line("Workman's comp", 1.28, true, false, false),
  line('General liability', gl),
  line('Health / fringes', 16.00),
  line('Safety & PPE', 5.25, true, false, false),
  line('Small tools & consumables', 10.00, true, false, false),
  line('State / city / local tax', 0),
];

export const RATE_TEMPLATES = {
  industrial: {
    label: 'Industrial / mechanical',
    description: 'Direct + indirect build-ups seeded from a real industrial T&M form. ~51% burden, 10% overhead, 15% profit.',
    sheet: {
      perDiemDaily: 137.50, perDiemPaid: 125, perDiemWeekly: 825, perDiemHoursPerDay: 10,
      markupMaterials: 10, markupSubs: 10, markupRentals: 10, markupSpecialty: 10,
      terms: STD_TERMS,
    },
    groups: [
      {
        name: 'Direct labor', ohSt: 10, ohOt: 0, ohDt: 0, profitSt: 15, profitOt: 10, profitDt: 10,
        lines: industrialLines(8.25),
        crafts: [
          { name: 'Foreman I',            wage: 44 },
          { name: 'Mechanical Craftsman', wage: 38, definition: 'pipe fitter, pipe/structural welder, iron worker' },
          { name: 'Specialty Craftsman',  wage: 40, definition: 'specialty pipe fitter/welder, millwright, tank erector, operators, instrumentation' },
          { name: 'E&I Journeyman',       wage: 38 },
          { name: 'E&I Apprentice',       wage: 34 },
          { name: 'Civil Craftsman',      wage: 38, definition: 'carpenter, concrete finisher' },
          { name: 'Helper',               wage: 32 },
          { name: 'Labor / Firewatch',    wage: 26 },
        ],
      },
      {
        name: 'Indirect labor', ohSt: 10, ohOt: 0, ohDt: 0, profitSt: 15, profitOt: 10, profitDt: 10,
        lines: industrialLines(8.33),
        crafts: [
          { name: 'Project Manager',      wage: 85 },
          { name: 'Superintendent',       wage: 54 },
          { name: 'Scheduler / Field Engineer', wage: 54 },
          { name: 'Safety',               wage: 52 },
          { name: 'Foreman II',           wage: 48 },
          { name: 'QA / QC',              wage: 55 },
          { name: 'Clerical',             wage: 33 },
          { name: 'Tool Room Attendant',  wage: 34 },
          { name: 'Expeditor / Material Handler', wage: 36 },
        ],
      },
    ],
  },

  residential: {
    label: 'Residential / service',
    description: 'One build-up, lighter burden. A starting point for a service shop pricing by crew.',
    sheet: {
      perDiemDaily: null, perDiemPaid: null, perDiemWeekly: null, perDiemHoursPerDay: 8,
      markupMaterials: 25, markupSubs: 15, markupRentals: 15, markupSpecialty: 25,
      terms: [
        'Overtime is any hours over 8 per day or 40 per week, and all weekend hours.',
        'A minimum service fee applies to single-technician calls.',
        'Invoice terms NET 15.',
      ],
    },
    groups: [
      {
        name: 'Field labor', ohSt: 10, ohOt: 0, ohDt: 0, profitSt: 20, profitOt: 15, profitDt: 15,
        lines: [
          line('FICA', 6.20), line('Medicare', 1.45), line('SUTA', 2.70), line('FUTA', 0.60),
          line("Workers' comp", 8.00, true, false, false),
          line('General liability', 3.00),
          line('Health insurance', 10.00),
          line('PTO & holiday', 4.00),
          line('Truck & fuel', 8.00, true, false, false),
          line('Tools & consumables', 3.00, true, false, false),
        ],
        crafts: [
          { name: 'Lead',       wage: 40 },
          { name: 'Journeyman', wage: 25 },
          { name: 'Apprentice', wage: 15 },
        ],
      },
    ],
  },

  blank: {
    label: 'Start from blank',
    description: 'One empty build-up. Add your own crafts and burden lines from scratch.',
    sheet: { perDiemHoursPerDay: 10, markupMaterials: 10, markupSubs: 10, markupRentals: 10, markupSpecialty: 10, terms: [] },
    groups: [{ name: 'Direct labor', ohSt: 0, ohOt: 0, ohDt: 0, profitSt: 0, profitOt: 0, profitDt: 0, lines: [], crafts: [] }],
  },
};

// ── Sheets ───────────────────────────────────────────────────────────────────

export async function listRateSheets() {
  const { data, error } = await supabase
    .from('rate_sheets').select('*')
    .order('status', { ascending: true })
    .order('effective_on', { ascending: false });
  if (error) throw error;
  return (data || []).map(dbToSheet);
}

/** Full sheet: groups (with lines + crafts) and equipment, ready for rateMath. */
export async function loadRateSheet(sheetId) {
  const [sheetRes, groupsRes, linesRes, craftsRes, equipRes] = await Promise.all([
    supabase.from('rate_sheets').select('*').eq('id', sheetId).single(),
    supabase.from('rate_groups').select('*').eq('sheet_id', sheetId).order('sort_order'),
    supabase.from('rate_burden_lines').select('*, rate_groups!inner(sheet_id)').eq('rate_groups.sheet_id', sheetId).order('sort_order'),
    supabase.from('rate_crafts').select('*, rate_groups!inner(sheet_id)').eq('rate_groups.sheet_id', sheetId).order('sort_order'),
    supabase.from('rate_equipment').select('*').eq('sheet_id', sheetId).order('sort_order'),
  ]);
  for (const r of [sheetRes, groupsRes, linesRes, craftsRes, equipRes]) {
    if (r.error) throw r.error;
  }
  const sheet = dbToSheet(sheetRes.data);
  sheet.groups = (groupsRes.data || []).map(dbToGroup).map((g) => ({
    ...g,
    lines:  (linesRes.data  || []).filter((l) => l.group_id === g.id).map(dbToLine),
    crafts: (craftsRes.data || []).filter((c) => c.group_id === g.id).map(dbToCraft),
  }));
  sheet.equipment = (equipRes.data || []).map(dbToEquip);
  return sheet;
}

/** Create a sheet from a template. Inserts sheet → groups → lines/crafts. */
export async function createRateSheet(ownerId, name, templateKey) {
  const tpl = RATE_TEMPLATES[templateKey] || RATE_TEMPLATES.blank;

  const { data: sheetRow, error: sheetErr } = await supabase
    .from('rate_sheets')
    .insert({ owner_id: ownerId, ...sheetToDb({ ...tpl.sheet, name, status: 'draft' }) })
    .select().single();
  if (sheetErr) throw sheetErr;

  for (let gi = 0; gi < tpl.groups.length; gi++) {
    const g = tpl.groups[gi];
    const { data: groupRow, error: groupErr } = await supabase
      .from('rate_groups')
      .insert({ owner_id: ownerId, sheet_id: sheetRow.id, ...groupToDb({ ...g, sortOrder: gi }) })
      .select().single();
    if (groupErr) throw groupErr;

    if (g.lines.length) {
      const { error } = await supabase.from('rate_burden_lines').insert(
        g.lines.map((l, i) => ({ owner_id: ownerId, group_id: groupRow.id, ...lineToDb({ ...l, sortOrder: i }) })));
      if (error) throw error;
    }
    if (g.crafts.length) {
      const { error } = await supabase.from('rate_crafts').insert(
        g.crafts.map((c, i) => ({
          owner_id: ownerId, group_id: groupRow.id,
          ...craftToDb({ qty: 0, stHours: 40, otHours: 10, dtHours: 0, ...c, sortOrder: i }),
        })));
      if (error) throw error;
    }
  }
  return sheetRow.id;
}

export async function updateRateSheet(sheetId, patch) {
  const { error } = await supabase.from('rate_sheets').update(sheetToDb(patch)).eq('id', sheetId);
  if (error) throw error;
}

export async function deleteRateSheet(sheetId) {
  const { error } = await supabase.from('rate_sheets').delete().eq('id', sheetId);
  if (error) throw error;
}

// ── Groups / lines / crafts / equipment: row-level CRUD ──────────────────────

export async function updateRateGroup(id, g) {
  const { error } = await supabase.from('rate_groups').update(groupToDb(g)).eq('id', id);
  if (error) throw error;
}

export async function addBurdenLine(ownerId, groupId, sortOrder) {
  const { data, error } = await supabase.from('rate_burden_lines')
    .insert({ owner_id: ownerId, group_id: groupId, ...lineToDb({ name: '', pct: 0, sortOrder }) })
    .select().single();
  if (error) throw error;
  return dbToLine(data);
}

export async function updateBurdenLine(id, l) {
  const { error } = await supabase.from('rate_burden_lines').update(lineToDb(l)).eq('id', id);
  if (error) throw error;
}

export async function deleteBurdenLine(id) {
  const { error } = await supabase.from('rate_burden_lines').delete().eq('id', id);
  if (error) throw error;
}

export async function addRateCraft(ownerId, groupId, sortOrder) {
  const { data, error } = await supabase.from('rate_crafts')
    .insert({ owner_id: ownerId, group_id: groupId, ...craftToDb({ name: '', wage: 0, qty: 0, stHours: 40, otHours: 10, dtHours: 0, sortOrder }) })
    .select().single();
  if (error) throw error;
  return dbToCraft(data);
}

export async function updateRateCraft(id, c) {
  const { error } = await supabase.from('rate_crafts').update(craftToDb(c)).eq('id', id);
  if (error) throw error;
}

export async function deleteRateCraft(id) {
  const { error } = await supabase.from('rate_crafts').delete().eq('id', id);
  if (error) throw error;
}

export async function addRateEquipment(ownerId, sheetId, sortOrder) {
  const { data, error } = await supabase.from('rate_equipment')
    .insert({ owner_id: ownerId, sheet_id: sheetId, ...equipToDb({ name: '', sortOrder }) })
    .select().single();
  if (error) throw error;
  return dbToEquip(data);
}

export async function updateRateEquipment(id, e) {
  const { error } = await supabase.from('rate_equipment').update(equipToDb(e)).eq('id', id);
  if (error) throw error;
}

export async function deleteRateEquipment(id) {
  const { error } = await supabase.from('rate_equipment').delete().eq('id', id);
  if (error) throw error;
}
