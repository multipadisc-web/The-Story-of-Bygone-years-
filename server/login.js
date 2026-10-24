const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE = 'http://localhost:3000';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('1) 生成登录二维码…');
  const keyRes = await (await fetch(BASE + '/login/qr/key')).json();
  const unikey = keyRes.data && keyRes.data.unikey;
  if (!unikey){ console.log('获取 key 失败：', JSON.stringify(keyRes)); process.exit(1); }

  const qrRes = await (await fetch(BASE + '/login/qr/create?key=' + encodeURIComponent(unikey))).json();
  const qrimg = qrRes.data && qrRes.data.qrimg;
  if (!qrimg){ console.log('获取二维码失败：', JSON.stringify(qrRes)); process.exit(1); }

  const qrPath = path.join(__dirname, 'qr.png');
  const b64 = qrimg.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(qrPath, Buffer.from(b64, 'base64'));
  console.log('   二维码已保存：' + qrPath);
  try { execSync('cmd /c start "" "' + qrPath + '"'); console.log('   已尝试打开二维码，请用「网易云音乐」App 扫码'); }
  catch(e){ console.log('   请手动打开 server/qr.png，用网易云音乐 App 扫码'); }

  console.log('2) 等待扫码…（有效期约 4 分钟）');
  for (let i = 0; i < 120; i++){
    await sleep(2000);
    try {
      const chk = await (await fetch(BASE + '/login/qr/check?key=' + encodeURIComponent(unikey))).json();
      if (chk.code === 803){ console.log('3) 登录成功！Cookie 已保存，之后能播放你有权限的整首歌（含 VIP）。'); return; }
      if (chk.code === 800){ console.log('   二维码已过期，请重新运行：node login.js'); return; }
    } catch(e){}
  }
  console.log('   超时未扫码');
})();
