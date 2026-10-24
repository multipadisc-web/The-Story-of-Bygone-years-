/* ============================================================
   音乐：本地音频 / 录音 / 网易云搜歌
   ============================================================ */

function pauseAllAudio(){
  editorPage.querySelectorAll('audio').forEach(a => { a.pause(); a.closest('.audio').querySelector('.audio__toggle').textContent = '▶'; });
}
function createAudio(src, name){
  const el = document.createElement('div');
  el.className = 'audio';
  el.innerHTML = '<span class="audio__grip">⠿</span><button class="audio__toggle">▶</button><span class="audio__name"></span><audio class="audio__src" src="' + src + '"></audio>';
  el.querySelector('.audio__name').textContent = name;
  const pr = editorPage.getBoundingClientRect();
  const x = pr.width/2 + (Math.random()*160 - 80);
  const y = pr.height/2 + (Math.random()*160 - 80);
  el.style.left = Math.max(0, x) + 'px';
  el.style.top = Math.max(0, y) + 'px';
  el.style.zIndex = 3;
  editorPage.appendChild(el);
  el.dataset.start = '0';
  el.dataset.end = '';
  makeDraggable(el, el.querySelector('.audio__grip'));
  el.addEventListener('mousedown', () => selectEl(el, 'audio'));
  const toggle = el.querySelector('.audio__toggle');
  const audio = el.querySelector('audio');
  audio.addEventListener('loadedmetadata', () => {
    if (!el.dataset.end) el.dataset.end = String(Math.round(audio.duration));
    if (selected === el) positionTrim(el);
  });
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    if (audio.paused){
      pauseAllAudio();
      audio.currentTime = parseFloat(el.dataset.start || 0);
      audio.play();
      toggle.textContent = '⏸';
    } else {
      audio.pause();
      toggle.textContent = '▶';
    }
  });
  audio.addEventListener('timeupdate', () => {
    const end = parseFloat(el.dataset.end);
    if (end && audio.currentTime >= end){
      audio.pause();
      audio.currentTime = parseFloat(el.dataset.start || 0);
      toggle.textContent = '▶';
    }
  });
  audio.addEventListener('ended', () => { toggle.textContent = '▶'; });
  selectEl(el, 'audio');
}

/* 网易云搜歌（非官方接口，个人演示用） */
async function searchSongs(){
  const kw = songSearch.value.trim();
  if (!kw) return;
  songResults.innerHTML = '<p class="panel__empty">搜索中…</p>';
  try {
    const r = await fetch(API + '/search?keywords=' + encodeURIComponent(kw) + '&limit=20');
    const data = await r.json();
    const songs = (data.result && data.result.songs) || [];
    if (!songs.length){ songResults.innerHTML = '<p class="panel__empty">没有结果，换个关键词</p>'; return; }
    songResults.innerHTML = '';
    songs.forEach(s => {
      const b = document.createElement('button');
      b.className = 'song-item';
      const main = document.createElement('span'); main.className = 'song-item__main';
      const n = document.createElement('span'); n.className = 'song-item__name'; n.textContent = s.name;
      const a = document.createElement('span'); a.className = 'song-item__artist'; a.textContent = (s.artists || []).map(x => x.name).join(' / ');
      main.appendChild(n); main.appendChild(a);
      const d = document.createElement('span'); d.className = 'song-item__dur'; d.textContent = fmtDur(s.duration);
      b.appendChild(main); b.appendChild(d);
      b.addEventListener('click', () => playSong(s));
      songResults.appendChild(b);
    });
  } catch(e) {
    songResults.innerHTML = '<p class="panel__empty">搜索失败：请确认本地服务已启动<br/>（server 目录运行 npm start）</p>';
  }
}
async function playSong(s){
  try {
    const r = await fetch(API + '/song/url/v1?id=' + s.id + '&level=standard');
    const data = await r.json();
    const url = data.data && data.data[0] && data.data[0].url;
    if (url){ createAudio(url, s.name); showToast('已添加：' + s.name); }
    else { showToast('这首歌暂无版权，试试别的'); }
  } catch(e) {
    showToast('获取播放链接失败');
  }
}

/* 登录网易云：进入音乐面板时检查登录状态，未登录自动弹出二维码 */
async function refreshLoginStatus(){
  try {
    const r = await fetch(API + '/login/status');
    const d = await r.json();
    if (d.loggedIn){
      // 已登录：不弹二维码
      clearInterval(loginPolling);
      loginBox.hidden = true;
      loginBtn.disabled = false;
      loginBtn.textContent = '✅ 已登录网易云';
    } else {
      // 未登录：自动弹出二维码
      loginBtn.textContent = '🔐 登录网易云（解锁整首）';
      startLogin();
    }
  } catch(e){}
}
async function startLogin(){
  try {
    const keyRes = await (await fetch(API + '/login/qr/key')).json();
    const unikey = keyRes.data && keyRes.data.unikey;
    if (!unikey){ showToast('获取登录二维码失败'); return; }
    const qrRes = await (await fetch(API + '/login/qr/create?key=' + encodeURIComponent(unikey))).json();
    const qrimg = qrRes.data && qrRes.data.qrimg;
    if (!qrimg){ showToast('获取登录二维码失败'); return; }
    loginQr.src = qrimg;
    loginBox.hidden = false;
    loginBtn.disabled = true;
    clearInterval(loginPolling);
    let tries = 0;
    loginPolling = setInterval(async () => {
      tries++;
      if (tries > 120){ clearInterval(loginPolling); loginBox.hidden = true; loginBtn.disabled = false; showToast('登录超时，请重试'); return; }
      try {
        const chk = await (await fetch(API + '/login/qr/check?key=' + encodeURIComponent(unikey))).json();
        if (chk.code === 803){
          clearInterval(loginPolling);
          loginBox.hidden = true;
          loginBtn.disabled = false;
          refreshLoginStatus();
          showToast('登录成功 ✓ 现在能放整首歌了');
        } else if (chk.code === 800){
          clearInterval(loginPolling);
          loginBox.hidden = true;
          loginBtn.disabled = false;
          showToast('二维码已过期，再点一次重新生成');
        }
      } catch(e){}
    }, 2000);
  } catch(e){
    showToast('登录失败：请确认服务已启动（server 目录 npm start）');
  }
}
