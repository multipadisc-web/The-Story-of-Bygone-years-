/* ============================================================
   配置：端口 / JWT / MySQL / 微信 / 数据库名 / Cookie 文件
   ============================================================ */
const path = require('path');

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  JWT_SECRET: process.env.JWT_SECRET || 'bygone-dev-secret-change-me',
  MYSQL: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    charset: 'utf8mb4'
  },
  WECHAT: {
    appid: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
    redirect: process.env.WECHAT_REDIRECT || 'http://localhost:3000/api/wechat/callback'
  },
  DB: 'bygone',
  COOKIE_FILE: path.join(__dirname, 'cookie.json')
};
