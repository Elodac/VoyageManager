// ============================================================
// core/print.js — documents imprimables (planning, valise, dossier)
//
// Un seul point de sortie, une seule feuille de style de base.
// Ouvre un onglet via Blob (pas de document.write), et prévient
// clairement si le navigateur bloque les fenêtres surgissantes.
// ============================================================

const PRINT_BASE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#111;font-size:12px;line-height:1.45;background:#f1f5f9}
  .page{max-width:960px;margin:0 auto;padding:20px;background:#fff}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;
         border-bottom:2.5px solid #1e293b;padding-bottom:10px;margin-bottom:16px}
  header h1{font-size:19px;font-weight:700}
  header .sub{font-size:11px;color:#475569;margin-top:3px}
  header .right{text-align:right;font-size:10px;color:#64748b;line-height:1.7}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;
     border-bottom:1px solid #999;padding-bottom:4px;margin:0 0 8px}
  section{break-inside:avoid;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px}
  td,th{padding:3px 6px;border-bottom:1px solid #eee;vertical-align:top;text-align:left}
  td.t{white-space:nowrap;color:#555;width:96px;font-weight:600}
  ul{list-style:none}
  .cols2{column-count:2;column-gap:22px}
  footer{margin-top:18px;border-top:1px solid #ccc;padding-top:8px;
         font-size:10px;color:#888;display:flex;justify-content:space-between}
  .toolbar{display:flex;gap:8px;margin-bottom:14px}
  .toolbar button{font-size:13px;padding:8px 16px;border:1px solid #1e293b;
                  background:#1e293b;color:#fff;border-radius:6px;cursor:pointer;font-weight:600}
  .toolbar button.sec{background:#fff;color:#1e293b}
  @media print{
    body{background:#fff}
    .toolbar,.no-print{display:none!important}
    .page{max-width:none;padding:0}
    @page{margin:10mm;size:A4 portrait}
  }
`;

/**
 * Ouvre un document imprimable dans un nouvel onglet.
 * @param {string} title  titre du document
 * @param {string} body   HTML (déjà échappé par l'appelant)
 * @param {{footer?:string, landscape?:boolean}} [opts]
 */
function vmOpenPrintable(title, body, opts) {
  const o = opts || {};
  const footer = o.footer || 'VoyageManager';
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)}</title>
<style>${PRINT_BASE_CSS}${o.landscape ? '@media print{@page{size:A4 landscape}}' : ''}</style>
</head><body><div class="page">
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
    <button type="button" class="sec" onclick="window.close()">✕ Fermer</button>
  </div>
  ${body}
  <footer><span>${escHtml(footer)}</span><span>Bon voyage ✈️</span></footer>
</div></body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener');
  if (!w) {
    URL.revokeObjectURL(url);
    showToast('⚠️ Autorise les fenêtres surgissantes pour imprimer', { tone: 'error', ms: 6000 });
    return null;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return w;
}

Object.assign(window, { vmOpenPrintable, PRINT_BASE_CSS });
