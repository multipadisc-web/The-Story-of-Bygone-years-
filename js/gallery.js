/* ============================================================
   画廊 + 封面选择 + 保存
   ============================================================ */

function collectItems(){
  const items = [...editorPage.querySelectorAll('.tel, .stick, .imgel, .audio')].map(el => {
    if (el.classList.contains('tel')){
      const txt = el.querySelector('.tel__text');
      return { type:'text', x:el.offsetLeft, y:el.offsetTop, text:txt.innerText, font:txt.style.fontFamily||'', size:txt.style.fontSize||'', color:txt.style.color||'', lineHeight:txt.style.lineHeight||'', letterSpacing:txt.style.letterSpacing||'', align:txt.style.textAlign||'', z:el.style.zIndex||'' };
    } else if (el.classList.contains('stick')){
      const g = el.querySelector('.stick__glyph');
      return { type:'sticker', x:el.offsetLeft, y:el.offsetTop, emoji:g.textContent, size:g.style.fontSize||'', z:el.style.zIndex||'' };
    } else if (el.classList.contains('imgel')){
      const img = el.querySelector('.imgel__img');
      return { type:'img', x:el.offsetLeft, y:el.offsetTop, src:img.getAttribute('src'), width:img.style.width||'', radius:img.style.borderRadius||'', z:el.style.zIndex||'' };
    } else {
      const name = el.querySelector('.audio__name').textContent;
      const src = el.querySelector('audio').getAttribute('src');
      return { type:'audio', x:el.offsetLeft, y:el.offsetTop, name, src, start:el.dataset.start||'', end:el.dataset.end||'', z:el.style.zIndex||'' };
    }
  });
  if (strokes.length) items.push({ type:'draw', strokes });
  return items;
}

function openCoverModal(){
  coverGrid.innerHTML = '';
  document.getElementById('coverSign').value = (editing && editing.entry.sign) ? editing.entry.sign : '';
  document.getElementById('coverTag').value = (editing && editing.entry.tag) ? editing.entry.tag : '手账';
  renderMoodPicks((editing && editing.entry.mood) || '', (editing && editing.entry.weather) || '');
  const imgs = [...editorPage.querySelectorAll('.imgel__img')].map(i => i.getAttribute('src'));
  if (imgs.length === 0){
    coverGrid.innerHTML = '<p class="cover-modal__empty">手账里还没有图片<br/>可以「导入封面」，或直接「不用封面」</p>';
  } else {
    imgs.forEach(src => {
      const b = document.createElement('button');
      b.className = 'cover-thumb';
      b.innerHTML = '<img src="' + src + '" alt="">';
      b.addEventListener('click', () => finalizeSave(src));
      coverGrid.appendChild(b);
    });
  }
  coverModal.hidden = false;
}
function closeCoverModal(){ coverModal.hidden = true; }

/* 心情 / 天气选择按钮 */
function renderMoodPicks(mood, weather){
  coverMood.innerHTML = '';
  coverWeather.innerHTML = '';
  MOODS.forEach(m => {
    const b = document.createElement('button');
    b.className = 'pick' + (m === mood ? ' active' : '');
    b.textContent = m;
    b.addEventListener('click', () => {
      coverMood.querySelectorAll('.pick').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    coverMood.appendChild(b);
  });
  WEATHERS.forEach(w => {
    const b = document.createElement('button');
    b.className = 'pick' + (w === weather ? ' active' : '');
    b.textContent = w;
    b.addEventListener('click', () => {
      coverWeather.querySelectorAll('.pick').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
    coverWeather.appendChild(b);
  });
}

async function finalizeSave(cover){
  const wasEditing = editing;
  const date = wasEditing ? wasEditing.entry.date : new Date().toISOString();
  const sign = (document.getElementById('coverSign').value || '').trim();
  const tag = document.getElementById('coverTag').value || '手账';
  const moodEl = coverMood.querySelector('.pick.active');
  const weatherEl = coverWeather.querySelector('.pick.active');
  const mood = moodEl ? moodEl.textContent : '';
  const weather = weatherEl ? weatherEl.textContent : '';
  const payload = { date, cover, sign, tag, mood, weather, items: pendingItems };
  if (authToken){
    const url = wasEditing ? (API + '/api/entries/' + wasEditing.entry.id) : (API + '/api/entries');
    const method = wasEditing ? 'PUT' : 'POST';
    try {
      const r = await fetch(url, { method, headers: { 'Content-Type':'application/json', Authorization:'Bearer ' + authToken }, body: JSON.stringify(payload) });
      if (!r.ok){ const d = await r.json().catch(() => ({})); throw new Error(d.error || '保存失败'); }
    } catch(e) {
      closeCoverModal();
      showToast('保存失败：' + (e.message || '无法连接服务器'));
      return;
    }
  } else {
    const entryObj = wasEditing ? Object.assign({ id: wasEditing.entry.id }, payload) : Object.assign({ id: Date.now() }, payload);
    try {
      await dbAddEntry(entryObj);
    } catch(e) {
      closeCoverModal();
      showToast('保存失败：浏览器存储不可用');
      return;
    }
  }
  closeCoverModal();
  clearPage();
  closeEditor();
  renderGallery();
  showToast(wasEditing ? '已更新 ✓' : (authToken ? '已保存到云端 ✓' : '已保存到本地 ✓'));
  editing = null;
}

let galleryStore = []; // 最近一次加载的数据缓存（搜索/筛选时不重新拉取）

async function renderGallery(){
  let store = [];
  if (authToken){
    try {
      const r = await fetch(API + '/api/entries', { headers: { Authorization: 'Bearer ' + authToken } });
      if (r.ok) store = await r.json();
    } catch(e) { store = []; }
  } else {
    try {
      store = await dbGetEntries();
    } catch(e) {
      store = JSON.parse(localStorage.getItem('bygone_entries') || '[]');
    }
  }
  galleryStore = store;
  renderGalleryCards(store);
}

/* 按搜索 / 标签过滤后重绘（不重新加载数据） */
function refreshGalleryFilter(){ renderGalleryCards(galleryStore); }

function renderTagChips(store){
  const tags = ['全部'].concat([...new Set(store.map(e => e.tag || '手账'))]);
  galleryTags.innerHTML = '';
  tags.forEach(t => {
    const b = document.createElement('button');
    const active = (t === '全部') ? !galleryFilter.tag : (galleryFilter.tag === t);
    b.className = 'gtag' + (active ? ' active' : '');
    b.textContent = t === '全部' ? '全部' : '#' + t;
    b.addEventListener('click', () => { galleryFilter.tag = (t === '全部' ? '' : t); renderGalleryCards(galleryStore); });
    galleryTags.appendChild(b);
  });
}

function renderGalleryCards(store){
  const grid = document.querySelector('.gallery__grid');
  // 登录时隐藏示例卡，未登录作为预览展示
  document.querySelectorAll('.gallery__grid > figure.card:not(.card--saved)').forEach(c => {
    c.style.display = authToken ? 'none' : '';
  });
  grid.querySelectorAll('.card--saved').forEach(el => el.remove());

  renderTagChips(store);

  let saved = store.slice().reverse();
  if (galleryFilter.tag) saved = saved.filter(e => (e.tag || '手账') === galleryFilter.tag);
  if (galleryFilter.q){
    const q = galleryFilter.q.trim().toLowerCase();
    saved = saved.filter(e => {
      const text = (e.items || []).map(i => i.type === 'text' ? (i.text || '') : '').join(' ');
      return (text + ' ' + (e.sign || '') + ' ' + (e.tag || '')).toLowerCase().includes(q);
    });
  }

  saved.forEach((entry, i) => {
    const fig = document.createElement('figure');
    fig.className = 'card card--saved';
    fig.style.setProperty('--veil', VEILS[i % VEILS.length]);
    const quote = escapeHtml(entryQuote(entry.items) || '这段往事，还没有文字。');
    const date = fmtDate(entry.date);
    const tag = entry.tag || '手账';
    const sign = entry.sign || '未署名';
    const mood = entry.mood || '';
    const weather = entry.weather || '';
    const moodTag = (mood || weather) ? mood + (weather ? ' ' + weather : '') : '';
    const img = entry.cover ? '<img class="card__img" src="' + entry.cover + '" alt="" loading="lazy" decoding="async" />' : '';
    fig.innerHTML = '<div class="card__frame"><div class="card__veil"></div>' + img
      + '<button class="card__del" title="删除这段往事">×</button>'
      + '<div class="card__text"><div class="card__meta"><span class="card__date">' + date + '</span><span class="card__tag">#' + escapeHtml(tag) + '</span></div>'
      + '<p class="card__quote">' + quote + '</p><span class="card__sign">— ' + escapeHtml(sign) + '</span></div>'
      + '<div class="card__chip">' + date + (moodTag ? ' · ' + moodTag : '') + '</div></div>';
    fig.querySelector('.card__del').addEventListener('click', e => { e.stopPropagation(); deleteEntry(entry); });
    fig.addEventListener('click', () => openEditor(entry));
    grid.insertBefore(fig, grid.firstChild);
  });
  document.querySelectorAll('.card--saved').forEach(c => io.observe(c));
  document.querySelector('.gallery__count b').textContent = authToken ? saved.length : (saved.length + 8);
  const emptyEl = document.getElementById('galleryEmpty');
  if (emptyEl) emptyEl.hidden = !(authToken && store.length === 0);
}

/* 删除一段往事（云端 / 本地） */
async function deleteEntry(entry){
  if (!confirm('确定删除这段往事吗？删除后不可恢复。')) return;
  if (authToken){
    try {
      const r = await fetch(API + '/api/entries/' + entry.id, { method:'DELETE', headers:{ Authorization:'Bearer ' + authToken } });
      if (!r.ok){ const d = await r.json().catch(() => ({})); showToast('删除失败：' + (d.error || '请重试')); return; }
    } catch(e){ showToast('删除失败：无法连接服务器'); return; }
  } else {
    try { await dbDeleteEntry(entry.id); } catch(e){ showToast('删除失败'); return; }
  }
  showToast('已删除');
  renderGallery();
}
