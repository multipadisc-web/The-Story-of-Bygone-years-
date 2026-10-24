/* ============================================================
   编辑器：打开/关闭、元素、手画、素材库
   ============================================================ */

function setToolsVisible(on){
  document.querySelector('.editor__rail').classList.toggle('tools-hidden', !on);
  if (!on){
    stickerPanel.hidden = true;
    musicPanel.hidden = true;
    drawbar.hidden = true;
    setDrawMode(false);
    hideToolbar();
  }
}

function loadEntryIntoEditor(entry){
  let autoPlayed = false; // 打开手账时，只自动播放第一段音频
  (entry.items || []).forEach(item => {
    if (item.type === 'text'){
      const el = document.createElement('div');
      el.className = 'tel';
      el.style.left = (item.x||0)+'px'; el.style.top = (item.y||0)+'px'; el.style.zIndex = item.z || 2;
      el.innerHTML = '<span class="tel__grip">⠿</span><div class="tel__text" contenteditable="true"></div>';
      const t = el.querySelector('.tel__text'); t.textContent = item.text || '';
      if (item.font) t.style.fontFamily = item.font;
      if (item.size) t.style.fontSize = item.size;
      if (item.color) t.style.color = item.color;
      if (item.lineHeight) t.style.lineHeight = item.lineHeight;
      if (item.letterSpacing) t.style.letterSpacing = item.letterSpacing;
      if (item.align) t.style.textAlign = item.align;
      editorPage.appendChild(el);
      makeDraggable(el, el.querySelector('.tel__grip'));
      el.addEventListener('mousedown', () => selectEl(el, 'text'));
    } else if (item.type === 'sticker'){
      const el = document.createElement('div');
      el.className = 'stick';
      el.style.left = (item.x||0)+'px'; el.style.top = (item.y||0)+'px'; el.style.zIndex = item.z || 3;
      el.innerHTML = '<span class="stick__grip">⠿</span><span class="stick__glyph"></span>';
      const g = el.querySelector('.stick__glyph'); g.textContent = item.emoji || '';
      if (item.size) g.style.fontSize = item.size;
      editorPage.appendChild(el);
      makeDraggable(el, el.querySelector('.stick__grip'));
      el.addEventListener('mousedown', () => selectEl(el, 'sticker'));
    } else if (item.type === 'img'){
      const el = document.createElement('div');
      el.className = 'imgel';
      el.style.left = (item.x||0)+'px'; el.style.top = (item.y||0)+'px'; el.style.zIndex = item.z || 3;
      el.innerHTML = '<span class="imgel__grip">⠿</span><img class="imgel__img" alt="">';
      const img = el.querySelector('.imgel__img'); img.src = item.src || '';
      if (item.width) img.style.width = item.width;
      if (item.radius) img.style.borderRadius = item.radius;
      editorPage.appendChild(el);
      makeDraggable(el, el.querySelector('.imgel__grip'));
      el.addEventListener('mousedown', () => selectEl(el, 'img'));
    } else if (item.type === 'audio'){
      const el = document.createElement('div');
      el.className = 'audio';
      el.style.left = (item.x||0)+'px'; el.style.top = (item.y||0)+'px'; el.style.zIndex = item.z || 3;
      el.innerHTML = '<span class="audio__grip">⠿</span><button class="audio__toggle">▶</button><span class="audio__name"></span><audio class="audio__src"></audio>';
      el.querySelector('.audio__name').textContent = item.name || '音频';
      const audio = el.querySelector('audio'); audio.src = item.src || '';
      el.dataset.start = item.start || '0'; el.dataset.end = item.end || '';
      editorPage.appendChild(el);
      makeDraggable(el, el.querySelector('.audio__grip'));
      el.addEventListener('mousedown', () => selectEl(el, 'audio'));
      const toggle = el.querySelector('.audio__toggle');
      audio.addEventListener('loadedmetadata', () => { if (!el.dataset.end) el.dataset.end = String(Math.round(audio.duration)); if (selected === el) positionTrim(el); });
      toggle.addEventListener('click', e => {
        e.stopPropagation();
        if (audio.paused){ pauseAllAudio(); audio.currentTime = parseFloat(el.dataset.start||0); audio.play(); toggle.textContent='⏸'; }
        else { audio.pause(); toggle.textContent='▶'; }
      });
      audio.addEventListener('timeupdate', () => {
        const end = parseFloat(el.dataset.end);
        if (end && audio.currentTime >= end){ audio.pause(); audio.currentTime = parseFloat(el.dataset.start||0); toggle.textContent='▶'; }
      });
      audio.addEventListener('ended', () => { toggle.textContent='▶'; });
      // 打开手账时，第一段音频自动播放（处于画廊卡片点击手势内，自动播放策略通常放行）
      if (!autoPlayed){
        autoPlayed = true;
        audio.play().then(() => {
          const startAt = parseFloat(el.dataset.start || 0);
          if (startAt > 0) audio.currentTime = startAt;
          toggle.textContent = '⏸';
        }).catch(() => { /* 被浏览器策略拦截时，用户可手动点播放 */ });
      }
    }
  });
  const drawItem = (entry.items || []).find(i => i.type === 'draw');
  strokes = drawItem ? drawItem.strokes : [];
  renderAllStrokes();
}

function openEditor(entry){
  if (!authToken){
    openAuthModal();
    return;
  }
  clearTimeout(closeTimer);
  editor.hidden = false;
  editor.classList.remove('is-open');
  activeTool = 'text';
  stickerPanel.hidden = true;
  musicPanel.hidden = true;
  drawbar.hidden = true;
  setDrawMode(false);
  document.querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('active', x.dataset.tool === 'text'));
  resizeDrawCanvas();
  clearPage();
  if (entry){
    editing = { entry, source: authToken ? 'cloud' : 'local' };
    loadEntryIntoEditor(entry);
    setToolsVisible(false);
    clearTimeout(toolsTimer);
    toolsTimer = setTimeout(() => setToolsVisible(true), 1500);
  } else {
    editing = null;
    clearTimeout(toolsTimer);
    setToolsVisible(true);
  }
  void editor.offsetWidth; // 强制回流，确保动画从头播放
  editor.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeEditor(){
  editor.classList.remove('is-open');
  document.body.style.overflow = '';
  hideToolbar();
  closeTimer = setTimeout(() => { editor.hidden = true; }, 360);
}
function hideToolbar(){
  textbar.hidden = true;
  if (selected){ selected.classList.remove('is-selected'); selected = null; selectedType = 'text'; }
}
function setActiveTool(btn){
  document.querySelectorAll('[data-tool]').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
}
function selectEl(el, type){
  if (selected && selected !== el) selected.classList.remove('is-selected');
  selected = el; selectedType = type;
  el.classList.add('is-selected');
  textbar.hidden = false;
  const isText = type === 'text';
  fontSelect.style.display = isText ? '' : 'none';
  sizeWrap.style.display = (type === 'audio') ? 'none' : '';
  colorWrap.style.display = isText ? '' : 'none';
  lineHeightWrap.style.display = isText ? '' : 'none';
  letterSpacingWrap.style.display = isText ? '' : 'none';
  radiusWrap.style.display = (type === 'img') ? '' : 'none';
  trimWrap.style.display = (type === 'audio') ? '' : 'none';
  if (isText){
    const txt = el.querySelector('.tel__text');
    fontSelect.value = txt.style.fontFamily || '';
    sizeRange.value = parseInt(txt.style.fontSize) || 24;
    textColor.value = txt.style.color || '#000000';
    lineHeightSelect.value = txt.style.lineHeight || '1.45';
    letterSpacingRange.value = Math.round(parseFloat(txt.style.letterSpacing) * 100) || 0;
  } else if (type === 'sticker'){
    sizeRange.value = parseInt(el.querySelector('.stick__glyph').style.fontSize) || 48;
  } else if (type === 'img'){
    const img = el.querySelector('.imgel__img');
    sizeRange.value = parseInt(img.style.width) || 140;
    radiusRange.value = parseInt(img.style.borderRadius) || 0;
  } else if (type === 'audio'){
    positionTrim(el);
  }
}

/* 层级：置顶 / 置底 */
function zIndexOf(el){ return parseInt(el.style.zIndex) || 0; }
function bringToFront(){
  if (!selected) return;
  const els = [...editorPage.querySelectorAll('.tel, .stick, .imgel, .audio')];
  const max = els.reduce((m, el) => Math.max(m, zIndexOf(el)), 0);
  selected.style.zIndex = max + 1;
}
function sendToBack(){
  if (!selected) return;
  const els = [...editorPage.querySelectorAll('.tel, .stick, .imgel, .audio')];
  const min = els.reduce((m, el) => Math.min(m, zIndexOf(el)), 9999);
  selected.style.zIndex = min - 1;
}
function makeDraggable(el, grip){
  grip.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
    const move = ev => {
      el.style.left = Math.max(0, ox + ev.clientX - sx) + 'px';
      el.style.top = Math.max(0, oy + ev.clientY - sy) + 'px';
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });
}
function createText(x, y){
  const el = document.createElement('div');
  el.className = 'tel';
  el.innerHTML = '<span class="tel__grip">⠿</span><div class="tel__text" contenteditable="true">写点什么…</div>';
  el.style.left = Math.max(0, x - 24) + 'px';
  el.style.top = Math.max(0, y - 12) + 'px';
  el.style.zIndex = 2;
  editorPage.appendChild(el);
  makeDraggable(el, el.querySelector('.tel__grip'));
  el.addEventListener('mousedown', () => selectEl(el, 'text'));
  selectEl(el, 'text');
  const txt = el.querySelector('.tel__text');
  txt.focus();
  const range = document.createRange();
  range.selectNodeContents(txt);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
}
function createSticker(emoji){
  const el = document.createElement('div');
  el.className = 'stick';
  el.innerHTML = '<span class="stick__grip">⠿</span><span class="stick__glyph">' + emoji + '</span>';
  const pr = editorPage.getBoundingClientRect();
  const x = pr.width/2 + (Math.random()*160 - 80);
  const y = pr.height/2 + (Math.random()*160 - 80);
  el.style.left = Math.max(0, x) + 'px';
  el.style.top = Math.max(0, y) + 'px';
  el.style.zIndex = 3;
  editorPage.appendChild(el);
  makeDraggable(el, el.querySelector('.stick__grip'));
  el.addEventListener('mousedown', () => selectEl(el, 'sticker'));
  selectEl(el, 'sticker');
}

/* 素材库：分类 + 导入 */
function renderTabs(){
  const tabs = [['all','全部'],['note','便利贴'],['tape','胶带'],['shape','贴纸'],['nature','花草'],['mood','情绪'],['deco','装饰'],['symbol','符号'],['import','导入']];
  panelTabs.innerHTML = '';
  tabs.forEach(([key,label]) => {
    const b = document.createElement('button');
    b.className = 'ptab' + (key === currentCat ? ' active' : '');
    b.dataset.cat = key;
    b.textContent = label;
    b.addEventListener('click', () => { currentCat = key; renderTabs(); renderGrid(); });
    panelTabs.appendChild(b);
  });
}
function renderGrid(){
  stickerGrid.innerHTML = '';
  if (currentCat === 'import'){
    if (importedImages.length === 0){
      stickerGrid.innerHTML = '<p class="panel__empty">还没有导入图片<br/>点上方「＋ 导入图片」</p>';
      return;
    }
    importedImages.forEach(src => {
      const b = document.createElement('button');
      b.className = 'sticker-btn sticker-btn--img';
      b.innerHTML = '<img src="' + src + '" alt="">';
      b.addEventListener('click', () => createImage(src));
      stickerGrid.appendChild(b);
    });
    return;
  }
  let items = [];
  if (currentCat === 'all'){ Object.values(CATEGORIES).forEach(c => { items = items.concat(c.items); }); }
  else { items = CATEGORIES[currentCat].items; }
  items.forEach(item => {
    const b = document.createElement('button');
    if (typeof item === 'string'){
      b.className = 'sticker-btn';
      b.textContent = item;
      b.addEventListener('click', () => createSticker(item));
    } else {
      b.className = 'sticker-btn sticker-btn--img';
      const url = svgDataUrl(item.svg);
      b.innerHTML = '<img src="' + url + '" alt="">';
      b.addEventListener('click', () => createImage(url, item.layer));
    }
    stickerGrid.appendChild(b);
  });
}
function resizeImage(src, maxDim, cb){
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (Math.max(w,h) > maxDim){ const k = maxDim / Math.max(w,h); w = Math.round(w*k); h = Math.round(h*k); }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(c.toDataURL('image/png'));
  };
  img.onerror = () => showToast('图片读取失败');
  img.src = src;
}
function createImage(src, layer){
  const el = document.createElement('div');
  el.className = 'imgel';
  el.innerHTML = '<span class="imgel__grip">⠿</span><img class="imgel__img" src="' + src + '" alt="">';
  const pr = editorPage.getBoundingClientRect();
  const x = pr.width/2 + (Math.random()*160 - 80);
  const y = pr.height/2 + (Math.random()*160 - 80);
  el.style.left = Math.max(0, x) + 'px';
  el.style.top = Math.max(0, y) + 'px';
  el.style.zIndex = (layer === 'paper') ? 1 : 3;
  editorPage.appendChild(el);
  makeDraggable(el, el.querySelector('.imgel__grip'));
  el.addEventListener('mousedown', () => selectEl(el, 'img'));
  selectEl(el, 'img');
}

/* 手画 */
function resizeDrawCanvas(){
  const dpr = window.devicePixelRatio || 1;
  const w = editorPage.clientWidth, h = editorPage.clientHeight;
  drawCanvas.width = Math.round(w * dpr);
  drawCanvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function drawStroke(s){
  ctx.globalCompositeOperation = (s.mode === 'erase') ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}
function renderAllStrokes(){
  ctx.clearRect(0, 0, editorPage.clientWidth, editorPage.clientHeight);
  strokes.forEach(drawStroke);
}
function clearPage(){
  editorPage.querySelectorAll('.tel, .stick, .imgel, .audio').forEach(el => el.remove());
  strokes = [];
  renderAllStrokes();
}
function setDrawMode(on){
  drawCanvas.style.pointerEvents = on ? 'auto' : 'none';
  drawCanvas.style.cursor = on ? 'crosshair' : 'default';
}
function drawPos(e){
  const r = drawCanvas.getBoundingClientRect();
  // 用视觉尺寸归一化到布局坐标，消除页面 rotateX/透视带来的缩放偏移
  return {
    x: r.width ? (e.clientX - r.left) / r.width * editorPage.clientWidth : 0,
    y: r.height ? (e.clientY - r.top) / r.height * editorPage.clientHeight : 0
  };
}

/* 音频片段裁剪 */
function trimDuration(el){
  const audio = el.querySelector('audio');
  return audio.duration || parseFloat(el.dataset.end) || 120;
}
function positionTrim(el){
  const dur = trimDuration(el);
  const start = parseFloat(el.dataset.start || 0);
  const end = parseFloat(el.dataset.end || dur);
  const p = v => (Math.max(0, Math.min(dur, v)) / dur * 100) + '%';
  trimStartHandle.style.left = p(start);
  trimEndHandle.style.left = p(end);
  trimSelection.style.left = p(start);
  trimSelection.style.width = p(end - start);
  trimTime.textContent = Math.round(start) + 's — ' + Math.round(end) + 's';
}
function dragTrimHandle(handle, isStart){
  handle.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (!selected) return;
    const dur = trimDuration(selected);
    const rect = trimTrack.getBoundingClientRect();
    const move = ev => {
      let frac = (ev.clientX - rect.left) / rect.width;
      frac = Math.max(0, Math.min(1, frac));
      const t = Math.round(frac * dur);
      if (isStart){
        const end = parseFloat(selected.dataset.end || dur);
        selected.dataset.start = String(Math.min(t, end));
      } else {
        const start = parseFloat(selected.dataset.start || 0);
        selected.dataset.end = String(Math.max(t, start));
      }
      positionTrim(selected);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  });
}
