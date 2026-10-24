/* ============================================================
   通用工具函数
   ============================================================ */

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function entryQuote(items){ const t = items.find(i => i.type === 'text'); return t ? t.text : ''; }

function fmtDate(iso){ const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return d.getFullYear() + ' · ' + p(d.getMonth()+1) + ' · ' + p(d.getDate()); }

function fmtDur(ms){
  if (!ms) return '';
  const s = Math.round(ms/1000);
  return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
}
