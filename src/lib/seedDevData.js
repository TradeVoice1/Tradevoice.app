// Developer-only seed function. Populates the calling user's account with
// realistic-looking demo data across every feature surface so the founder
// can click through the whole app without manually building data first.
//
// What gets seeded:
//   - Profile filled in (company, phone, license, tagline, accent color,
//     all states, all five core trades, every payment-method handle, Stripe
//     "connected" flag flipped so the customer Pay button renders)
//   - 8 clients
//   - 3 team members (status='pending' — visible in dropdowns + Tech
//     Performance widget, but no real auth user is created; the user can
//     mint real ones later via Settings → Team)
//   - 4 maintenance plans (recurring service)
//   - 2 time-off windows (one active, one upcoming)
//   - 12 jobs (mix of past/today/this week/next week, multiple trades,
//     assigned to different techs)
//   - 8 quotes (draft, sent, viewed, accepted, declined, invoiced — one
//     of each status so every UI state is exercised)
//   - 14 invoices (draft, sent, viewed, partial, paid, overdue, void —
//     spanning the last 4 months so the 12-month chart and folder
//     browser have data)
//
// IMPORTANT: This intentionally uses the regular data-layer functions so
// every insert respects RLS. Running it from an owner's session creates
// rows owned by that owner — running from a tech's session would fail
// at the team_members insert (techs can't manage their own owner's team).
//
// Idempotency: NOT idempotent. Each run appends another set of rows. The
// "Seed Demo Data" button in Settings confirms before running and warns
// the user that re-running compounds the data.

import { addClient }       from "../data/clients";
import { upsertTeamMember } from "../data/team";
import { upsertPlan }      from "../data/plans";
import { upsertTimeOff }   from "../data/timeOff";
import { upsertJob }       from "../data/jobs";
import { upsertQuote }     from "../data/quotes";
import { upsertInvoice }   from "../data/invoices";
import { upsertProfile }   from "../data/auth";

const uid = () => Math.random().toString(36).slice(2, 11);

// ── Date helpers — all anchored on "today" so the data ages with the calendar ──
const today  = new Date();
const isoDay = (d) => d.toISOString().split('T')[0];
const daysFromNow = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
const monthsAgo   = (n) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return d; };

// ── Sample line items used across quotes/invoices ──
const sampleLabor = (rate = 110, hrs = 4, desc = 'Service labor') => ([
  { id: uid(), desc, hrs, rate },
]);
const sampleMats = (rows = []) => rows.map(r => ({ id: uid(), unit: 'ea', ...r }));
const sampleEquip = (rows = []) => rows.map(r => ({ id: uid(), unit: 'day', ...r }));

export async function seedDevData({ userId, userName, userEmail, onProgress }) {
  const log = (msg) => { if (onProgress) onProgress(msg); console.log('[seed]', msg); };

  // ──────────────────────────────────────────────────────────────────────
  // 1. Profile — flip on every feature surface
  // ──────────────────────────────────────────────────────────────────────
  log('Filling in profile + payment methods…');
  await upsertProfile(userId, {
    name:    userName || 'Alex Rivera',
    company: "Cornerstone Mechanical & Trades Co.",
    phone:   '(512) 555-0100',
    trades:  ['Plumber', 'Electrician', 'HVAC', 'Roofing', 'Specialty'],
    states:  ['Texas', 'Louisiana'],
    tagline: 'From the first estimate to the final payment.',
    license: 'TX-MP-12847',
    accentColor:  '#2d6a4f',
    defaultTerms: 'Net 30. Late payments accrue 1.5% monthly interest. We honor a 1-year workmanship warranty on all installations.',
    role:    'owner',
    payments: {
      stripe:  { connected: true },
      paypal:  { connected: true },
      venmo:   { handle: '@cornerstone-mechanical' },
      cashapp: { handle: '$CornerstoneMech' },
      zelle:   { handle: '(512) 555-0100' },
      check:   { handle: "Make checks payable to Cornerstone Mechanical Inc., 1840 Commerce Blvd, Austin TX 78704" },
      cash:    { enabled: true },
    },
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Clients — 8 across residential + commercial
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 8 clients…');
  const clientDefs = [
    { name: 'Sandra Johnson',    company: '',                       email: 'sandra.j@example.com',  phone: '(512) 555-0142', address: '412 Oak Street, Austin TX 78704' },
    { name: 'Ray Torres',        company: '',                       email: 'ray.torres@example.com',phone: '(512) 555-0188', address: '2208 Maple Ave, Houston TX 77006' },
    { name: 'City Rentals Group',company: 'City Rentals LLC',       email: 'maint@cityrentals.com', phone: '(512) 555-0210', address: '1840 Commerce Blvd, Austin TX 78704' },
    { name: 'Linda Alvarez',     company: '',                       email: 'l.alvarez@example.com', phone: '(512) 555-0257', address: '318 Cypress Ln, Dallas TX 75201' },
    { name: 'Bayou Hospitality', company: 'Bayou Hospitality Group',email: 'ops@bayoumgmt.com',     phone: '(225) 555-0301', address: '500 Restaurant Row, Baton Rouge LA 70801' },
    { name: 'Marcus Reed',       company: '',                       email: 'm.reed@example.com',    phone: '(512) 555-0344', address: '1224 Live Oak Dr, Austin TX 78745' },
    { name: 'Allstate Claim 87234',company: 'Allstate Insurance',   email: 'claim87234@allstate.com',phone: '(800) 555-2554', address: '318 Cypress Ln, Dallas TX 75201' },
    { name: 'Reyes Construction',company: 'Reyes Construction GC',  email: 'office@reyesconstr.com',phone: '(512) 555-0399', address: '8800 Industrial Pkwy, San Antonio TX 78216' },
  ];
  const clients = [];
  for (const c of clientDefs) {
    try { clients.push(await addClient(userId, c)); }
    catch (e) { console.error('[seed] client failed:', c.name, e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Team — 3 pending techs (no auth user created; can be promoted later)
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 3 techs (pending invites)…');
  const techDefs = [
    { name: 'Carlos Reyes', email: 'carlos.demo@example.local', role: 'tech', trades: ['Plumber','HVAC'],    status: 'pending', branch: 'Austin',   phone: '(512) 555-0411', perms: { createQuotes: true, createInvoices: true, viewAllJobs: false, recordPayments: true,  viewClients: true,  viewDashboard: false } },
    { name: 'Jake Martinez', email: 'jake.demo@example.local',  role: 'tech', trades: ['Electrician'],       status: 'pending', branch: 'Austin',   phone: '(512) 555-0432', perms: { createQuotes: true, createInvoices: true, viewAllJobs: false, recordPayments: false, viewClients: true,  viewDashboard: false } },
    { name: 'Mason Taylor',  email: 'mason.demo@example.local', role: 'tech', trades: ['HVAC','Refrigeration'],status: 'pending', branch: 'Houston', phone: '(713) 555-0455', perms: { createQuotes: true, createInvoices: true, viewAllJobs: true,  recordPayments: true,  viewClients: true,  viewDashboard: true  } },
  ];
  const techs = [];
  for (const t of techDefs) {
    try { techs.push(await upsertTeamMember(userId, t)); }
    catch (e) { console.error('[seed] team member failed:', t.name, e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. Maintenance plans — 4 recurring service contracts
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 4 maintenance plans…');
  const planDefs = [
    {
      title: 'HVAC Spring/Fall Tune-Up',
      clientId: clients[2]?.id || null,
      clientName: clients[2]?.name || '',
      trade: 'HVAC',
      frequency: 'semi-annual',
      lastDoneAt:  isoDay(daysFromNow(-60)),
      nextDueAt:   isoDay(daysFromNow(8)),
      defaultDuration: 2,
      defaultTechUserId: techs[2]?.userId || null,
      notes: 'Two annual visits — coil clean, refrigerant check, capacitor check.',
      status: 'active',
    },
    {
      title: 'Quarterly Backflow Inspection',
      clientId: clients[4]?.id || null,
      clientName: clients[4]?.name || '',
      trade: 'Plumber',
      frequency: 'quarterly',
      lastDoneAt:  isoDay(daysFromNow(-30)),
      nextDueAt:   isoDay(daysFromNow(60)),
      defaultDuration: 1,
      defaultTechUserId: techs[0]?.userId || null,
      notes: 'Restaurant group — code requires quarterly backflow cert.',
      status: 'active',
    },
    {
      title: 'Annual Electrical Safety Inspection',
      clientId: clients[2]?.id || null,
      clientName: clients[2]?.name || '',
      trade: 'Electrician',
      frequency: 'annual',
      lastDoneAt:  isoDay(daysFromNow(-300)),
      nextDueAt:   isoDay(daysFromNow(65)),
      defaultDuration: 3,
      defaultTechUserId: techs[1]?.userId || null,
      notes: 'All units — panel + GFCI + outlets check.',
      status: 'active',
    },
    {
      title: 'Monthly Pool Service',
      clientId: clients[3]?.id || null,
      clientName: clients[3]?.name || '',
      trade: 'Specialty',
      frequency: 'monthly',
      lastDoneAt:  isoDay(daysFromNow(-25)),
      nextDueAt:   isoDay(daysFromNow(5)),
      defaultDuration: 1,
      defaultTechUserId: null,
      notes: 'Chemistry + skim + filter clean.',
      status: 'active',
    },
  ];
  for (const p of planDefs) {
    try { await upsertPlan(userId, p); }
    catch (e) { console.error('[seed] plan failed:', p.title, e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 5. Time-off — one current, one upcoming
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 2 time-off windows…');
  if (techs[0]?.userId) {
    try {
      await upsertTimeOff(userId, {
        techUserId: techs[0].userId,
        startDate: isoDay(daysFromNow(-1)),
        endDate:   isoDay(daysFromNow(1)),
        reason: 'Personal day',
      });
    } catch (e) { console.error('[seed] time-off 1 failed:', e); }
  }
  if (techs[1]?.userId) {
    try {
      await upsertTimeOff(userId, {
        techUserId: techs[1].userId,
        startDate: isoDay(daysFromNow(14)),
        endDate:   isoDay(daysFromNow(18)),
        reason: 'Vacation',
      });
    } catch (e) { console.error('[seed] time-off 2 failed:', e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 6. Jobs — 12 spanning past/today/this week/next week
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 12 scheduled jobs…');
  const jobDefs = [
    { offset: -3, hour:  9, dur: 3, title: 'Drain repair — kitchen',           trade: 'Plumber',     tech: 0, client: 0, status: 'completed' },
    { offset: -2, hour: 13, dur: 4, title: 'Panel swap 100A → 200A',           trade: 'Electrician', tech: 1, client: 1, status: 'completed' },
    { offset: -1, hour:  8, dur: 4, title: 'AC condenser replacement',          trade: 'HVAC',        tech: 2, client: 2, status: 'completed' },
    { offset:  0, hour:  9, dur: 5, title: 'Tankless water heater install',    trade: 'Plumber',     tech: 0, client: 0, status: 'in-progress' },
    { offset:  0, hour: 14, dur: 2, title: 'GFCI outlets — kitchen + baths',    trade: 'Electrician', tech: 1, client: 5, status: 'scheduled' },
    { offset:  1, hour:  8, dur: 4, title: 'Mini-split install — bedroom 2',    trade: 'HVAC',        tech: 2, client: 3, status: 'scheduled' },
    { offset:  1, hour: 13, dur: 3, title: 'Shut-off valve replacement',       trade: 'Plumber',     tech: 0, client: 4, status: 'scheduled' },
    { offset:  2, hour: 10, dur: 6, title: 'Roof tear-off & reroof — 22 sq',    trade: 'Roofing',     tech: null, client: 6, status: 'scheduled' },
    { offset:  3, hour:  9, dur: 2, title: 'Quarterly backflow inspection',    trade: 'Plumber',     tech: 0, client: 4, status: 'scheduled' },
    { offset:  4, hour: 12, dur: 3, title: 'Bathroom rough-in plumbing',       trade: 'Plumber',     tech: 0, client: 7, status: 'scheduled' },
    { offset:  5, hour:  8, dur: 4, title: 'Furnace tune-up',                   trade: 'HVAC',        tech: 2, client: 2, status: 'scheduled' },
    { offset:  7, hour: 10, dur: 2, title: 'GFCI run + 2 new circuits',         trade: 'Electrician', tech: 1, client: 7, status: 'scheduled' },
  ];
  for (const j of jobDefs) {
    const client = clients[j.client];
    const tech   = j.tech != null ? techs[j.tech] : null;
    try {
      await upsertJob(userId, {
        title:        j.title,
        clientName:   client?.name || '',
        clientId:     client?.id || null,
        phone:        client?.phone || '',
        address:      client?.address || '',
        date:         daysFromNow(j.offset),
        startHour:    j.hour,
        duration:     j.dur,
        trade:        j.trade,
        techUserId:   tech?.userId || null,
        status:       j.status,
        notes:        '',
      });
    } catch (e) { console.error('[seed] job failed:', j.title, e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 7. Quotes — one of every status
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 8 quotes across all statuses…');
  const quoteDefs = [
    { offset:  -1, status: 'draft',     client: 0, trade: 'Plumber',     title: 'Master bath shower retrofit',          markup: 15, tax: 8.25 },
    { offset:  -3, status: 'sent',      client: 1, trade: 'Electrician', title: 'Whole-home surge protection',          markup: 18, tax: 8.25 },
    { offset:  -5, status: 'viewed',    client: 2, trade: 'HVAC',        title: 'Mini-split — 3-zone install',           markup: 15, tax: 8.25 },
    { offset:  -8, status: 'accepted',  client: 3, trade: 'HVAC',        title: 'AC condenser replacement',              markup: 15, tax: 8.25 },
    { offset: -12, status: 'declined',  client: 5, trade: 'Plumber',     title: 'Sewer line replacement',                markup: 15, tax: 8.25 },
    { offset: -25, status: 'invoiced',  client: 0, trade: 'Plumber',     title: 'Kitchen drain repair',                  markup: 15, tax: 8.25 },
    { offset: -40, status: 'invoiced',  client: 2, trade: 'HVAC',        title: 'Annual maintenance contract — 12 units',markup: 12, tax: 8.25 },
    { offset:  -6, status: 'sent',      client: 4, trade: 'Specialty',   title: 'Commercial kitchen quarterly service',  markup: 15, tax: 8.5 },
  ];
  for (const q of quoteDefs) {
    const client = clients[q.client];
    try {
      await upsertQuote(userId, {
        number:      null,
        clientId:    client?.id || null,
        title:       q.title,
        trade:       q.trade,
        status:      q.status,
        scope:       `Scope of work for ${q.title}. See attached line items for detail. Materials are warranted for 1 year, workmanship for 2 years. 50% deposit required to schedule; balance due upon completion.`,
        labor:       sampleLabor(110, 4, q.title + ' — labor'),
        materials:   sampleMats([
          { desc: 'Main parts/equipment',  qty: 1, cost: 380 },
          { desc: 'Fittings & consumables',qty: 1, unit: 'lot', cost: 75 },
        ]),
        equipment:   sampleEquip([]),
        markup:      q.markup,
        tax:         q.tax,
        terms:       'Quote valid for 30 days. 50% deposit required to schedule. Balance due upon completion.',
        createdAt:   isoDay(daysFromNow(q.offset)),
        sentAt:      q.status !== 'draft' ? isoDay(daysFromNow(q.offset + 1)) : null,
        expiresAt:   isoDay(daysFromNow(q.offset + 30)),
      });
    } catch (e) { console.error('[seed] quote failed:', q.title, e); }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 8. Invoices — 14 across statuses + 4 months for chart history
  // ──────────────────────────────────────────────────────────────────────
  log('Adding 14 invoices across statuses + 4 months…');
  const invDefs = [
    // This month
    { offset:   -2, status: 'paid',    client: 0, trade: 'Plumber',     tech: 0, title: 'Tankless water heater install',     materials: 1540, labor: 380, markup: 15, tax: 8.25, due: 28, paid: true },
    { offset:   -5, status: 'sent',    client: 1, trade: 'Electrician', tech: 1, title: '200A panel upgrade',                  materials:  485, labor: 880, markup: 20, tax: 8.25, due: 28, paid: false },
    { offset:   -8, status: 'partial', client: 2, trade: 'HVAC',        tech: 2, title: '3-ton condenser replacement',         materials: 1850, labor: 480, markup: 15, tax: 8.25, due: 28, paid: 1200 },
    { offset:  -12, status: 'viewed',  client: 4, trade: 'Plumber',     tech: 0, title: 'Backflow inspection — quarterly',     materials:    0, labor: 220, markup: 12, tax: 8.5,  due: 28, paid: false },
    { offset:  -15, status: 'draft',   client: 5, trade: 'Electrician', tech: 1, title: 'GFCI + circuits — quote follow-up',   materials:   96, labor: 320, markup: 15, tax: 8.25, due: 28, paid: false },
    // Last month — mostly paid
    { offset:  -38, status: 'paid',    client: 0, trade: 'Plumber',     tech: 0, title: 'Kitchen drain repair',                materials:  105, labor: 380, markup: 15, tax: 8.25, due: 28, paid: true },
    { offset:  -42, status: 'paid',    client: 6, trade: 'Roofing',     tech: null, title: 'Storm damage reroof — 22 sq',       materials: 2240, labor: 1850, markup: 18, tax: 8.25, due: 28, paid: true },
    { offset:  -48, status: 'overdue', client: 5, trade: 'Plumber',     tech: 0, title: 'Slab leak repair',                    materials:  220, labor: 850, markup: 15, tax: 8.25, due: 28, paid: false },
    { offset:  -52, status: 'paid',    client: 1, trade: 'Electrician', tech: 1, title: 'Generator transfer switch install',   materials:  485, labor: 660, markup: 18, tax: 8.25, due: 28, paid: true },
    // 2 months back
    { offset:  -68, status: 'paid',    client: 3, trade: 'HVAC',        tech: 2, title: 'Mini-split — 2-zone install',          materials: 2900, labor: 760, markup: 15, tax: 8.25, due: 28, paid: true },
    { offset:  -75, status: 'paid',    client: 2, trade: 'HVAC',        tech: 2, title: 'Annual maintenance — fall visit',      materials:   65, labor: 380, markup: 12, tax: 8.5,  due: 28, paid: true },
    { offset:  -82, status: 'void',    client: 4, trade: 'Specialty',   tech: 0, title: 'Disposal install (cancelled)',         materials:  120, labor: 130, markup: 15, tax: 8.25, due: 28, paid: false },
    // 3 months back
    { offset: -100, status: 'paid',    client: 7, trade: 'Plumber',     tech: 0, title: 'Master bath rough-in',                materials: 1680, labor: 1100,markup: 15, tax: 8.25, due: 28, paid: true },
    { offset: -108, status: 'paid',    client: 0, trade: 'Plumber',     tech: 0, title: 'Bathroom fixture upgrade',             materials:  420, labor: 380, markup: 15, tax: 8.25, due: 28, paid: true },
  ];
  for (const i of invDefs) {
    const client = clients[i.client];
    const tech   = i.tech != null ? techs[i.tech] : null;
    const createdAt = isoDay(daysFromNow(i.offset));
    const dueAt     = isoDay(daysFromNow(i.offset + i.due));
    const subtotal  = i.materials + i.labor;
    const markupAmt = i.materials * i.markup / 100;
    const taxAmt    = (i.materials + markupAmt) * i.tax / 100;
    const total     = subtotal + markupAmt + taxAmt;
    const paidAmt   = i.paid === true ? total : (typeof i.paid === 'number' ? i.paid : 0);
    const paymentsArr = paidAmt > 0 ? [{
      date:   isoDay(daysFromNow(i.offset + 14)),
      amount: paidAmt,
      method: 'card',
      note:   paidAmt < total ? 'Partial payment' : 'Paid in full',
    }] : [];
    const activityArr = [
      { date: createdAt,                        type: 'created', note: 'Invoice created' },
      ...(i.status !== 'draft' ? [{ date: isoDay(daysFromNow(i.offset + 1)),  type: 'sent',     note: 'Invoice link shared with customer' }] : []),
      ...(paidAmt > 0 ?            [{ date: isoDay(daysFromNow(i.offset + 14)), type: 'payment',  note: `Payment of $${paidAmt.toFixed(2)} received` }] : []),
    ];
    try {
      await upsertInvoice(userId, {
        number:        null,
        clientId:      client?.id || null,
        clientName:    client?.name || '',
        clientEmail:   client?.email || '',
        clientPhone:   client?.phone || '',
        clientAddress: client?.address || '',
        title:         i.title,
        trade:         i.trade,
        status:        i.status,
        terms:         'Net 30',
        createdAt,
        dueAt,
        paidAt:        i.paid === true ? isoDay(daysFromNow(i.offset + 14)) : null,
        labor:         sampleLabor(95, Math.max(1, Math.round(i.labor / 95)), i.title + ' — labor'),
        materials:     sampleMats([{ desc: 'Equipment & materials', qty: 1, cost: i.materials }]),
        equipment:     sampleEquip([]),
        markup:        i.markup,
        tax:           i.tax,
        notes:         '',
        payments:      paymentsArr,
        activity:      activityArr,
        techUserId:    tech?.userId || null,
        techName:      tech?.name || userName || '',
      });
    } catch (e) { console.error('[seed] invoice failed:', i.title, e); }
  }

  log('Seed complete!');
  return {
    profile:  true,
    clients:  clients.length,
    techs:    techs.length,
    plans:    planDefs.length,
    timeOff:  2,
    jobs:     jobDefs.length,
    quotes:   quoteDefs.length,
    invoices: invDefs.length,
  };
}
