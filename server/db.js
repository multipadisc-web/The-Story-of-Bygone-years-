/* ============================================================
   数据库：连接池 + 建表 + 认证中间件 + JWT 签发 + 网易云 Cookie
   ============================================================ */
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { MYSQL, DB, JWT_SECRET, COOKIE_FILE } = require('./config');

const pool = mysql.createPool(Object.assign({}, MYSQL, { database: DB, waitForConnections: true, connectionLimit: 10 }));

function loadCookie(){
  try { return JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8')).cookie || ''; }
  catch(e){ return ''; }
}

async function initDB(){
  const conn = await mysql.createConnection(MYSQL);
  await conn.query('CREATE DATABASE IF NOT EXISTS `' + DB + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.end();
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    wechat_openid VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try { await pool.query("ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(64) NOT NULL DEFAULT ''"); } catch(e){}
  await pool.query(`CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date VARCHAR(30) NOT NULL,
    cover LONGTEXT,
    items LONGTEXT,
    sign VARCHAR(100) NOT NULL DEFAULT '',
    tag VARCHAR(30) NOT NULL DEFAULT '手账',
    mood VARCHAR(20) NOT NULL DEFAULT '',
    weather VARCHAR(20) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try { await pool.query("ALTER TABLE entries ADD COLUMN sign VARCHAR(100) NOT NULL DEFAULT ''"); } catch(e){}
  try { await pool.query("ALTER TABLE entries ADD COLUMN tag VARCHAR(30) NOT NULL DEFAULT '手账'"); } catch(e){}
  try { await pool.query("ALTER TABLE entries ADD COLUMN mood VARCHAR(20) NOT NULL DEFAULT ''"); } catch(e){}
  try { await pool.query("ALTER TABLE entries ADD COLUMN weather VARCHAR(20) NOT NULL DEFAULT ''"); } catch(e){}
}

function auth(req, res, next){
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: '未登录' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch(e){ res.status(401).json({ error: '登录已过期，请重新登录' }); }
}
function sign(user){ return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' }); }

module.exports = { pool, loadCookie, initDB, auth, sign };
