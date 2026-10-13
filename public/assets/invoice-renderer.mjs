// studio rjl invoice renderer (public asset, no secrets here).
// called by the deployed invoicePdfGenerate bootstrap after it validates the
// shared secret. the bootstrap imports this module and passes the parsed body.
export default (async (body) => {
  const { PDFDocument, StandardFonts, rgb, PDFString } = await import("npm:pdf-lib@1.17.1");
  const fontkit = (await import("npm:@pdf-lib/fontkit@1.1.1")).default;
  const inv = body.invoice || {}, acc = body.account || {};
  let items = [];
  try { items = typeof inv.items === "string" ? JSON.parse(inv.items || "[]") : (inv.items || []); } catch (e) {}
  const BG = rgb(0.937, 0.914, 0.882), PALE = rgb(0.973, 0.957, 0.925), GREEN = rgb(0.298, 0.231, 0.082), DEEP = rgb(0.247, 0.192, 0.071), LINE = rgb(0.541, 0.478, 0.333), FAINT = rgb(0.478, 0.416, 0.247);
  const MO = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const fdate = (iso) => { const d = new Date(String(iso || "") + "T00:00:00"); return isNaN(d) ? "" : d.getDate() + " " + MO[d.getMonth()] + " " + d.getFullYear(); };
  const money = (n) => "$" + Number(n || 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = String(inv.invoice_number || "");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  pdf.registerFontkit(fontkit);
  let mono = serif;
  try {
    const fr = await fetch("https://studiorjl.com/assets/PTMono.ttf?v=1");
    if (fr.ok) mono = await pdf.embedFont(await fr.arrayBuffer());
  } catch (e) {}
  if (mono === serif) { try { mono = await pdf.embedFont(StandardFonts.Courier); } catch (e) {} }
  const W = 595.28, H = 841.89, M = 54, R = W - M, T = (t) => H - t;
  const D = (t, x, top, sz = 9.5, f = mono, c = GREEN) => page.drawText(t, { x, y: T(top), size: sz, font: f, color: c });
  const DR = (t, top, sz = 9.5, f = mono, c = GREEN) => page.drawText(t, { x: R - f.widthOfTextAtSize(t, sz), y: T(top), size: sz, font: f, color: c });
  const DC = (t, top, sz = 8, f = mono, c = FAINT) => page.drawText(t, { x: (W - f.widthOfTextAtSize(t, sz)) / 2, y: T(top), size: sz, font: f, color: c });
  const LN = (x1, t1, x2, t2, c, w) => page.drawLine({ start: { x: x1, y: T(t1) }, end: { x: x2, y: T(t2) }, color: c, thickness: w });
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG });
  D("s t u d i o   r j l", M, 54, 11); DR("invoice", 56, 26, serif, DEEP); LN(M, 68, R, 68, DEEP, 0.7);
  const up = String(inv.status || "") === "upcoming";
  [["invoice no.", num, "from: studio rjl"], ["issued", up ? "to be issued" : fdate(inv.issue_date), "supplier: Rebekah Jane Lamb"], ["due", up ? "on delivery" : fdate(inv.due_date), "abn: 21 408 763 859"]].forEach((row, i) => {
    const t0 = 88 + i * 14;
    D(row[0], M, t0); D(row[1], 133.5, t0); DR(row[2], t0);
  });
  D("billed to:", M, 185);
  D(String(acc.company_legal || acc.brand_name || ""), M, 205, 15, serif, DEEP);
  D("(Attn: " + String(acc.client_name || "") + ")", M, 223, 15, serif, DEEP);
  D("for:", M, 264);
  D(String(inv.title || ""), M, 284, 17, serif, DEEP);
  D("description of works", M, 342); DR("amount (aud)", 342);
  LN(M, 347.97, R, 347.97, LINE, 0.5);
  let top = 382.1;
  items.forEach((it) => {
    const ls = String(it.description || "").split("\n");
    ls.forEach((ln, i) => { if (ln.trim() || i === 0) D(ln, M, top + i * 12); });
    if (Number(it.amount || 0) > 0) DR(Number(it.amount).toFixed(2), top);
    top += 18 + 12 * (ls.length - 1);
  });
  LN(M, top - 8, R, top - 8, LINE, 0.5);
  top += 12;
  [["subtotal", Number(inv.subtotal || 0).toFixed(2)], ["gst (10%)", Number(inv.gst || 0).toFixed(2)]].forEach(([k, v]) => {
    D(k, M, top); DR(v, top); top += 17;
  });
  LN(R - 120, top - 9, R, top - 9, DEEP, 0.9);
  D("total incl. gst", M, top + 8, 10.5, mono, DEEP);
  DR(money(inv.total), top + 8, 10.5, mono, DEEP);
  page.drawRectangle({ x: M, y: T(520.28) - 118, width: W - 2 * M, height: 118, color: PALE, borderColor: LINE, borderWidth: 1 });
  const bx = M + 16;
  D("payment details:", bx, 536.3, 8.5, mono, FAINT);
  const sq = String(inv.square_url || "");
  if (sq && !up) {
    D("by card / online:", bx, 556.3);
    D("link here.", 178.9, 556.3);
    page.drawLine({ start: { x: 178.9, y: T(557.3) }, end: { x: 178.9 + mono.widthOfTextAtSize("link here.", 9.5), y: T(557.3) }, color: GREEN, thickness: 0.475 });
    const annot = pdf.context.register(pdf.context.obj({
      Type: "Annot", Subtype: "Link",
      Rect: [174.11, T(563.57), 236.95, T(546.55)],
      Border: [0, 0, 0], C: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(sq) }
    }));
    page.node.addAnnot(annot);
  } else {
    D("by card / online:", bx, 556.3);
    D("(checkout link provided when this invoice is due)", 178.9, 556.3, 9.5, mono, FAINT);
  }
  D("direct / bank:", bx, 580.3);
  D("Rebekah Jane Lamb", 178, 580.3);
  D("bsb 067873  \u00b7  account 20383225", 178.9, 596.3);
  D("reference:", bx, 623.5);
  const refBase = String(acc.brand_name || "").replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 12) || "RJL";
  const reference = /^rjl-/i.test(num) ? refBase + num.replace(/^rjl-/, "") : num.toUpperCase();
  D(reference, 179.6, 623.5);
  let noteTop = 660.2;
  if (String(inv.notes || "")) { D(String(inv.notes), M, noteTop, 9); noteTop += 16; }
  const paid = Number(inv.amount_paid || 0);
  if (paid > 0) {
    D("received " + money(paid) + " \u00b7 balance " + money(Number(inv.total || 0) - paid), M, noteTop, 9);
    noteTop += 16;
  }
  try {
    const lr = await fetch("https://studiorjl.com/assets/rjl-monogram.png");
    if (lr.ok) {
      const logo = await pdf.embedPng(await lr.arrayBuffer());
      page.drawImage(logo, { x: 268.49, y: T(774.28), width: 58.31, height: 82.86 });
    }
  } catch (e) {}
  DC("studio rjl \u00b7 design studio \u00b7 studiorjl.com \u00b7 hello@studiorjl.com", 793.9);
  DC("Rebekah Jane Lamb \u00b7 abn 21 408 763 859 \u00b7 wilson\u2019s creek, northern rivers nsw", 805.9);
  const bytes = await pdf.save();
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="studiorjl-invoice-' + num.toLowerCase() + '.pdf"'
    }
  });
})
