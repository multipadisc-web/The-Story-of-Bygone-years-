/* ============================================================
   Bygone 后端入口：中间件 + 挂载路由 + 启动
   ============================================================ */

/* 加载本地 .env（存放数据库密码等敏感配置，不入 git） */
const fs = require('fs');
const path = require('path');
(function loadEnv(){
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
})();

const express = require('express');
const cors = require('cors');
const { PORT, DB } = require('./config');
const { initDB, loadCookie } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' })); // 图片/音频 base64 较大
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));

/* 挂载各模块路由（路径保持不变） */
app.use(require('./routes/netease')); // 网易云代理
app.use(require('./routes/auth'));    // 账号 + 微信
app.use(require('./routes/entries')); // 手账条目

/* 首页：方便直接 http://localhost:3000/ 打开 */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

(async () => {
  try { await initDB(); console.log('✓ 数据库就绪（' + DB + '）'); }
  catch(e){ console.error('⚠ 数据库初始化失败（账号/云端保存不可用）: ' + e.message); }
  app.listen(PORT, () => console.log('Bygone server @ http://localhost:' + PORT + (loadCookie() ? '  [网易云已登录]' : '  [网易云未登录]')));
})();
