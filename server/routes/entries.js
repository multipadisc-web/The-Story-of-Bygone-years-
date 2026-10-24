/* ============================================================
   手账条目（云存储）：读取 / 新建 / 覆盖更新 / 删除
   ============================================================ */
const express = require('express');
const { pool, auth } = require('../db');

const router = express.Router();

router.get('/api/entries', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, date, cover, sign, tag, mood, weather, items FROM entries WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
    res.json(rows.map(r => ({ id: r.id, date: r.date, cover: r.cover || '', sign: r.sign || '', tag: r.tag || '手账', mood: r.mood || '', weather: r.weather || '', items: (() => { try { return JSON.parse(r.items || '[]'); } catch(e){ return []; } })() })));
  } catch(e){ res.status(500).json({ error: '读取失败' }); }
});

router.post('/api/entries', auth, async (req, res) => {
  const { date, cover, sign, tag, mood, weather, items } = req.body || {};
  if (!date || !Array.isArray(items)) return res.status(400).json({ error: '数据不完整' });
  try {
    const [r] = await pool.query('INSERT INTO entries (user_id, date, cover, sign, tag, mood, weather, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [req.user.id, date, cover || '', sign || '', tag || '手账', mood || '', weather || '', JSON.stringify(items)]);
    res.json({ ok: true, id: r.insertId });
  } catch(e){ res.status(500).json({ error: '保存失败：内容可能过大（图片/音频占用大）' }); }
});

router.put('/api/entries/:id', auth, async (req, res) => {
  const { date, cover, sign, tag, mood, weather, items } = req.body || {};
  if (!date || !Array.isArray(items)) return res.status(400).json({ error: '数据不完整' });
  try {
    const [r] = await pool.query('UPDATE entries SET date = ?, cover = ?, sign = ?, tag = ?, mood = ?, weather = ?, items = ? WHERE id = ? AND user_id = ?', [date, cover || '', sign || '', tag || '手账', mood || '', weather || '', JSON.stringify(items), req.params.id, req.user.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: '未找到该手账' });
    res.json({ ok: true });
  } catch(e){ res.status(500).json({ error: '保存失败：内容可能过大' }); }
});

router.delete('/api/entries/:id', auth, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM entries WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: '未找到该手账' });
    res.json({ ok: true });
  } catch(e){ res.status(500).json({ error: '删除失败' }); }
});

module.exports = router;
