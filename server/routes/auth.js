/* ============================================================
   账号：注册 / 登录 / 当前用户 / 微信登录
   ============================================================ */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const { pool, auth, sign } = require('../db');
const { WECHAT } = require('../config');

const router = express.Router();

router.post('/api/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length > 50) return res.status(400).json({ error: '用户名不能超过 50 字' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.json({ token: sign({ id: r.insertId, username }), username, id: r.insertId });
  } catch(e){
    if (e && e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '用户名已被占用' });
    res.status(500).json({ error: '注册失败' });
  }
});

router.post('/api/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ token: sign(user), username: user.username, id: user.id });
  } catch(e){ res.status(500).json({ error: '登录失败' }); }
});

router.get('/api/me', auth, (req, res) => res.json({ id: req.user.id, username: req.user.username }));

/* 微信登录（网站应用扫码，需 WECHAT_APPID / WECHAT_SECRET / 已备案回调域名） */
router.get('/api/wechat/url', (req, res) => {
  if (!WECHAT.appid) return res.status(400).json({ error: '微信登录未配置（需设置 WECHAT_APPID）' });
  const state = crypto.randomBytes(16).toString('hex');
  const url = 'https://open.weixin.qq.com/connect/qrconnect'
    + '?appid=' + WECHAT.appid
    + '&redirect_uri=' + encodeURIComponent(WECHAT.redirect)
    + '&response_type=code&scope=snsapi_login&state=' + state
    + '#wechat_redirect';
  res.json({ url, state });
});

router.get('/api/wechat/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('缺少 code');
  try {
    const tr = await fetch('https://api.weixin.qq.com/sns/oauth2/access_token'
      + '?appid=' + WECHAT.appid + '&secret=' + WECHAT.secret
      + '&code=' + encodeURIComponent(code) + '&grant_type=authorization_code');
    const td = await tr.json();
    const openid = td.openid;
    if (!openid) return res.status(400).send('微信登录失败：' + (td.errmsg || '未知错误'));
    let [rows] = await pool.query('SELECT * FROM users WHERE wechat_openid = ?', [openid]);
    let user = rows[0];
    if (!user){
      const username = '微信用户' + openid.slice(-8);
      await pool.query("INSERT INTO users (username, password_hash, wechat_openid) VALUES (?, '', ?)", [username, openid]);
      [rows] = await pool.query('SELECT * FROM users WHERE wechat_openid = ?', [openid]);
      user = rows[0];
    }
    const token = sign(user);
    res.redirect('/?wx_token=' + encodeURIComponent(token) + '&wx_user=' + encodeURIComponent(user.username));
  } catch(e){
    res.status(500).send('微信登录失败');
  }
});

module.exports = router;
