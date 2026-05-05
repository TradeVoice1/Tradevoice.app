// QuickBooks CSV export — Phase 1 of QuickBooks support.
// Generates a line-item-format CSV the user can import via QuickBooks Online's
// File → Import → Invoices flow (or QB Desktop's File → Utilities → Import → Excel Files).
//
// Format: one row per line item, with the invoice header repeated for every line.
// Markup is folded into the materials/equipment rates so the line totals match TV's totals.
// Sales tax becomes its own line item per invoice.

const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function invoicesToQbCsv(invoices) {
  const headers = ['InvoiceNo', 'Customer', 'InvoiceDate', 'DueDate', 'Terms', 'Item', 'Description', 'Qty', 'Rate', 'Amount'];
  const rows = [headers];

  invoices.forEach(inv => {
    const customer = inv.clientName?.trim() || 'Unknown Customer';
    const baseRow = [
      inv.number,
      customer,
      inv.createdAt || '',
      inv.dueAt || '',
      inv.terms || '',
    ];
    const markupMul = 1 + (Number(inv.markup) || 0) / 100;

    // Labor lines — no markup applied per TV's pricing rules.
    (inv.labor || []).forEach(r => {
      const qty = Number(r.hrs) || 0;
      const rate = Number(r.rate) || 0;
      rows.push([...baseRow, 'Labor', r.desc || '', qty, rate.toFixed(2), (qty * rate).toFixed(2)]);
    });

    // Materials — markup folded into the unit rate so QB sees the customer-facing price.
    (inv.materials || []).forEach(r => {
      const qty  = Number(r.qty)  || 0;
      const cost = Number(r.cost) || 0;
      const rate = cost * markupMul;
      const desc = r.unit ? `${r.desc} (${r.unit})` : r.desc;
      rows.push([...baseRow, 'Materials', desc || '', qty, rate.toFixed(2), (qty * rate).toFixed(2)]);
    });

    // Equipment — markup folded in.
    (inv.equipment || []).forEach(r => {
      const qty  = Number(r.qty)  || 0;
      const rate = (Number(r.rate) || 0) * markupMul;
      const desc = r.unit ? `${r.desc} (${r.unit})` : r.desc;
      rows.push([...baseRow, 'Equipment', desc || '', qty, rate.toFixed(2), (qty * rate).toFixed(2)]);
    });

    // Sales tax — single line per invoice. Simple base = mat+equip+markup
    // (mirrors what TV displays; states with labor-tax will round to the cent).
    const matsT  = (inv.materials || []).reduce((s, r) => s + (Number(r.qty)  || 0) * (Number(r.cost) || 0), 0);
    const equipT = (inv.equipment || []).reduce((s, r) => s + (Number(r.qty)  || 0) * (Number(r.rate) || 0), 0);
    const laborT = (inv.labor     || []).reduce((s, r) => s + (Number(r.hrs)  || 0) * (Number(r.rate) || 0), 0);
    const mkAmt  = (matsT + equipT) * ((Number(inv.markup) || 0) / 100);
    const taxRate = Number(inv.tax) || 0;
    const taxAmt = (matsT + equipT + mkAmt) * (taxRate / 100);
    if (taxAmt > 0.005) {
      rows.push([...baseRow, 'Sales Tax', `Sales Tax (${taxRate}%)`, 1, taxAmt.toFixed(2), taxAmt.toFixed(2)]);
    }
  });

  return rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
}

// Triggers a browser download. Adds a UTF-8 BOM so Excel opens it correctly.
export function downloadCsv(filename, content) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
