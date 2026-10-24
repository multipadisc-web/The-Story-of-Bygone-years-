/* ============================================================
   初始化：首屏效果 + 事件绑定 + 启动
   ============================================================ */

document.documentElement.classList.add('js');

/* 顶栏滚动态 */
addEventListener('scroll', () => {
  bar.classList.toggle('scrolled', scrollY > 30);
}, { passive:true });

/* 标题聚光：光标周围由模糊变清晰 */
(function(){
  const title = document.getElementById('title');
  const hero = document.querySelector('.hero');
  if (!title || !hero) return;
  if (window.matchMedia('(hover: none)').matches) return;
  let tx = -300, ty = -300, cx = -300, cy = -300;
  hero.addEventListener('mousemove', e => {
    const r = title.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
  });
  (function loop(){
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    title.style.setProperty('--mx', cx + 'px');
    title.style.setProperty('--my', cy + 'px');
    requestAnimationFrame(loop);
  })();
})();

/* 画廊滚动入场 */
document.querySelectorAll('.card').forEach(c => io.observe(c));

/* 触屏：点按切换「图片 ↔ 文字」 */
if (window.matchMedia('(hover: none)').matches) {
  document.querySelectorAll('.card').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('revealed'));
  });
}

/* 素材库：导入图片 */
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', () => {
  [...importInput.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      resizeImage(reader.result, 600, dataUrl => {
        importedImages.push(dataUrl);
        currentCat = 'import';
        renderTabs(); renderGrid();
        createImage(dataUrl);
      });
    };
    reader.readAsDataURL(file);
  });
  importInput.value = '';
});

document.getElementById('editorBack').addEventListener('click', closeEditor);
document.getElementById('panelClose').addEventListener('click', () => { stickerPanel.hidden = true; });

/* 音乐：本地导入 + 录音 */
musicClose.addEventListener('click', () => { musicPanel.hidden = true; });
audioBtn.addEventListener('click', () => audioInput.click());
audioInput.addEventListener('change', () => {
  [...audioInput.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = () => createAudio(reader.result, file.name);
    reader.readAsDataURL(file);
  });
  audioInput.value = '';
});
recordBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording'){
    mediaRecorder.stop();
  } else {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ showToast('当前环境不支持录音'); return; }
    navigator.mediaDevices.getUserMedia({ audio:true }).then(stream => {
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => createAudio(reader.result, '录音 ' + new Date().toLocaleTimeString());
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        recordBtn.textContent = '🎤 开始录音';
      };
      mediaRecorder.start();
      recordBtn.textContent = '⏹ 停止录音';
    }).catch(() => showToast('无法访问麦克风，请检查权限'));
  }
});

/* 网易云搜歌 */
searchBtn.addEventListener('click', searchSongs);
songSearch.addEventListener('keydown', e => { if (e.key === 'Enter') searchSongs(); });
loginBtn.addEventListener('click', startLogin);

/* 手画事件 */
drawCanvas.addEventListener('pointerdown', e => {
  if (activeTool !== 'draw') return;
  e.preventDefault();
  drawCanvas.setPointerCapture(e.pointerId);
  drawing = true;
  const p = drawPos(e);
  currentStroke = { mode: isErase ? 'erase' : 'draw', color: drawColor, size: parseInt(brushSize.value) || 4, points: [p] };
  ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = drawColor;
  ctx.lineWidth = parseInt(brushSize.value) || 4;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + 0.01, p.y + 0.01); ctx.stroke();
});
drawCanvas.addEventListener('pointermove', e => {
  if (!drawing) return;
  const p = drawPos(e);
  currentStroke.points.push(p);
  ctx.lineTo(p.x, p.y); ctx.stroke();
});
drawCanvas.addEventListener('pointerup', () => {
  if (!drawing) return;
  drawing = false;
  strokes.push(currentStroke);
  currentStroke = null;
});

/* 画笔工具栏 */
DRAW_COLORS.forEach(c => {
  const b = document.createElement('button');
  b.style.background = c;
  b.dataset.color = c;
  b.addEventListener('click', () => {
    drawColor = c; isErase = false; eraserBtn.classList.remove('active');
    document.querySelectorAll('#drawColors button').forEach(x => x.classList.toggle('active', x.dataset.color === c));
  });
  document.getElementById('drawColors').appendChild(b);
});
document.querySelector('#drawColors button').classList.add('active');
eraserBtn.addEventListener('click', () => { isErase = !isErase; eraserBtn.classList.toggle('active', isErase); });
document.getElementById('undoBtn').addEventListener('click', () => { strokes.pop(); renderAllStrokes(); });
document.getElementById('clearBtn').addEventListener('click', () => { strokes = []; renderAllStrokes(); });

addEventListener('resize', () => {
  if (editor.hidden) return;
  resizeDrawCanvas();
  renderAllStrokes();
});

/* 工具切换 */
document.querySelectorAll('[data-tool]').forEach(t => {
  t.addEventListener('click', () => {
    const name = t.dataset.tool;
    if (name === 'text'){ activeTool = 'text'; stickerPanel.hidden = true; musicPanel.hidden = true; drawbar.hidden = true; setDrawMode(false); setActiveTool(t); }
    else if (name === 'sticker'){ activeTool = 'sticker'; stickerPanel.hidden = false; musicPanel.hidden = true; drawbar.hidden = true; setDrawMode(false); setActiveTool(t); }
    else if (name === 'music'){ activeTool = 'music'; stickerPanel.hidden = true; musicPanel.hidden = false; drawbar.hidden = true; setDrawMode(false); setActiveTool(t); refreshLoginStatus(); }
    else if (name === 'draw'){ activeTool = 'draw'; stickerPanel.hidden = true; musicPanel.hidden = true; drawbar.hidden = false; setDrawMode(true); hideToolbar(); setActiveTool(t); }
  });
});

editorPage.addEventListener('click', e => {
  if (e.target !== editorPage) return;
  if (activeTool !== 'text') return;
  const r = editorPage.getBoundingClientRect();
  createText(e.clientX - r.left, e.clientY - r.top);
});
editorPage.addEventListener('mousedown', e => { if (e.target === editorPage) hideToolbar(); });

fontSelect.addEventListener('change', () => { if (selected && selectedType === 'text') selected.querySelector('.tel__text').style.fontFamily = fontSelect.value; });
sizeRange.addEventListener('input', () => {
  if (!selected) return;
  const v = sizeRange.value + 'px';
  if (selectedType === 'text') selected.querySelector('.tel__text').style.fontSize = v;
  else if (selectedType === 'sticker') selected.querySelector('.stick__glyph').style.fontSize = v;
  else if (selectedType === 'img') selected.querySelector('.imgel__img').style.width = v;
});
radiusRange.addEventListener('input', () => {
  if (selected && selectedType === 'img') selected.querySelector('.imgel__img').style.borderRadius = radiusRange.value + 'px';
});

/* 文字样式：颜色 / 行距 / 字距 / 对齐 */
textColor.addEventListener('input', () => { if (selected && selectedType === 'text') selected.querySelector('.tel__text').style.color = textColor.value; });
lineHeightSelect.addEventListener('change', () => { if (selected && selectedType === 'text') selected.querySelector('.tel__text').style.lineHeight = lineHeightSelect.value; });
letterSpacingRange.addEventListener('input', () => { if (selected && selectedType === 'text') selected.querySelector('.tel__text').style.letterSpacing = (letterSpacingRange.value / 100) + 'em'; });

/* 层级：置顶 / 置底 */
bringFront.addEventListener('click', bringToFront);
sendBack.addEventListener('click', sendToBack);

dragTrimHandle(trimStartHandle, true);
dragTrimHandle(trimEndHandle, false);
document.getElementById('textDelete').addEventListener('click', () => { if (selected){ selected.remove(); hideToolbar(); } });

/* 保存（打开封面选择） */
document.getElementById('editorSave').addEventListener('click', () => {
  pendingItems = collectItems();
  openCoverModal();
});

/* 封面选择 */
coverImport.addEventListener('click', () => coverInput.click());
coverInput.addEventListener('change', () => {
  const file = coverInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => resizeImage(reader.result, 900, dataUrl => finalizeSave(dataUrl));
  reader.readAsDataURL(file);
  coverInput.value = '';
});
coverSkip.addEventListener('click', () => {
  const cover = (editing && editing.entry && editing.entry.cover) ? editing.entry.cover : '';
  finalizeSave(cover);
});
document.getElementById('coverBack').addEventListener('click', closeCoverModal);
coverModal.addEventListener('click', e => { if (e.target === coverModal) closeCoverModal(); });

/* 账号登录 */
authSubmit.addEventListener('click', doAuth);
authSwitch.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'register' : 'login'));
authLogout.addEventListener('click', logout);
document.getElementById('authClose').addEventListener('click', closeAuthModal);
authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });
document.getElementById('loginNav').addEventListener('click', openAuthModal);
updateLoginButton();

/* 微信登录 */
document.getElementById('wxLogin').addEventListener('click', async () => {
  try {
    const r = await fetch(API + '/api/wechat/url');
    const data = await r.json();
    if (!r.ok){ authErr.textContent = data.error || '微信登录不可用'; return; }
    location.href = data.url;
  } catch(e){ authErr.textContent = '无法连接服务器，请先启动后端'; }
});

/* 微信登录回调：从 URL 读取 token */
(function(){
  const q = new URLSearchParams(location.search);
  const t = q.get('wx_token');
  if (t){
    authToken = t;
    authUsername = q.get('wx_user') || '';
    sessionStorage.setItem('bygone_token', authToken);
    sessionStorage.setItem('bygone_user', authUsername);
    history.replaceState(null, '', location.pathname);
    updateLoginButton();
    renderGallery();
    showToast('微信登录成功 · ' + authUsername);
  }
})();

/* 画廊搜索 / 标签筛选（不重新加载，仅本地过滤） */
gallerySearch.addEventListener('input', () => { galleryFilter.q = gallerySearch.value; refreshGalleryFilter(); });

/* 启动 */
renderTabs();
renderGrid();
(async () => { await migrateFromLocalStorage(); await renderGallery(); })();

document.querySelectorAll('[data-new]').forEach(b => b.addEventListener('click', () => openEditor()));
