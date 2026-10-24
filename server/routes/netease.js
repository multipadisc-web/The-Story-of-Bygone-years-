/* ============================================================
   网易云音乐代理：搜歌 / 播放链接 / 扫码登录
   ============================================================ */
const fs = require('fs');
const express = require('express');
const api = require('NeteaseCloudMusicApi');
const { loadCookie } = require('../db');
const { COOKIE_FILE } = require('../config');

const router = express.Router();

const ne = (fn, args, res) => fn(args).then(r => res.json(r.body)).catch(e => res.status(500).json({ error: String(e && e.message || e) }));

router.get('/search', (req, res) => ne(api.search, { keywords: req.query.keywords || '', type: 1, limit: Number(req.query.limit) || 20, cookie: loadCookie() }, res));
router.get('/song/url/v1', (req, res) => ne(api.song_url_v1, { id: req.query.id || '', level: req.query.level || 'standard', cookie: loadCookie() }, res));
router.get('/login/qr/key', (req, res) => ne(api.login_qr_key, {}, res));
router.get('/login/qr/create', (req, res) => ne(api.login_qr_create, { key: req.query.key || '', qrimg: true }, res));
router.get('/login/qr/check', (req, res) => {
  api.login_qr_check({ key: req.query.key || '' }).then(r => {
    if (r.body && r.body.cookie) fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie: r.body.cookie }, null, 2));
    res.json(r.body);
  }).catch(e => res.status(500).json({ error: String(e && e.message || e) }));
});
router.get('/login/status', (req, res) => res.json({ loggedIn: !!loadCookie() }));

module.exports = router;
