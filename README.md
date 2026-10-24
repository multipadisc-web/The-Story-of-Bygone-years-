# The Story of Bygone years · 手账日记本

> 把说不出口的情绪，留成一本可以随时翻开的往事。

面向零零后的情绪手账 Web 应用：在自由画布上用文字 + 图片 + 音乐 + 贴纸 DIY 记录心情、留存记忆，配上心情与天气标记。黑白极简编辑部风格，参考 whiteboard.is。

## ✨ 功能

- **记忆墙首页**：首屏标题带「光标聚光」模糊效果，往下滑是瀑布流记忆卡片，悬停/点按翻出日记里的一句话
- **画廊筛选 + 搜索**：按种类（tag）筛选、按文字/署名搜索，本地即时过滤
- **自由画布编辑器**：白纸手账，元素可拖放、置顶/置底
  - 文字：字体（宋/楷/黑/Fraunces）、字号、颜色、行距、字距、位置
  - 素材库：便利贴 / 胶带 / 贴纸 / 花草 / 情绪 / 符号等分类（SVG 手绘质感 + emoji）
  - 图片：导入照片，可调大小/圆角
  - 手画：画笔 / 橡皮 / 颜色 / 粗细 / 撤销
  - 音乐：本地导入音频、录音，以及网易云搜歌；打开手账时音乐自动播放
- **打开即编辑**：点击卡片，手账像「拆信」一样 3D 展开，工具栏延迟 1.5s 浮现，改完保存自动**覆盖**原内容
- **封面选择**：保存时可选手账里的图片、单独导入封面、或不用封面；署名 + 种类（tag）+ **心情/天气**标记
- **删除手账**：卡片右下角一键删除（云端/本地）
- **账号系统**：注册/登录（密码至少 6 位），微信扫码登录（结构就绪，待配置）
- **双存储**：登录后手账存 MySQL（云端）；未登录存 IndexedDB（本地）

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | 原生 HTML / CSS / JS（模块化：`index.html` + `css/` + `js/`） |
| 后端 | Node.js + Express（模块化：`config` / `db` / `routes`） |
| 数据库 | MySQL（`mysql2`） |
| 鉴权 | `bcryptjs` 密码加密 + `jsonwebtoken`（JWT） |
| 本地存储 | IndexedDB（未登录时） |
| 音乐 | `NeteaseCloudMusicApi`（非官方，个人演示用） |

## 📁 目录结构

```
手账日记本/
├─ index.html          # 页面结构 + 引用
├─ css/style.css       # 全部样式
├─ js/                 # 前端逻辑（按职责拆分，state 先加载、main 最后）
│  ├─ state.js         # 全局状态 + DOM 引用 + 贴纸/心情天气数据
│  ├─ utils.js         # 工具函数
│  ├─ storage.js       # IndexedDB 本地存储
│  ├─ editor.js        # 编辑器 + 手画 + 素材库
│  ├─ music.js         # 音乐 + 网易云
│  ├─ gallery.js       # 画廊 + 封面选择 + 保存 + 删除
│  ├─ auth.js          # 登录/注册/微信
│  └─ main.js          # 初始化 + 事件绑定
├─ server/
│  ├─ app.js           # 后端入口（中间件 + 挂载路由 + 启动）
│  ├─ config.js        # 配置（端口/JWT/MySQL/微信）
│  ├─ db.js            # 连接池 + 建表 + 认证中间件
│  ├─ routes/          # 路由：netease（网易云）/ auth（账号）/ entries（手账）
│  ├─ .env             # 本地密钥（不入 git，见下方配置）
│  └─ start.bat        # Windows 一键启动
├─ README.md
├─ 思路图.md           # 产品思路
└─ 完善清单.md         # 迭代路线图（P0/P1/P2）
```

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- MySQL 本地运行

### 1. 配置数据库密码

在 `server/` 下新建 `.env` 文件，写入你的 MySQL 密码（**不要提交到 git**）：

```
MYSQL_PASSWORD=你的密码
```

### 2. 启动后端

```bash
cd server
npm install        # 首次安装依赖
npm start          # 或双击 start.bat
```

启动后会自动创建数据库 `bygone` 及表 `users`、`entries`。

### 3. 打开页面

浏览器访问 **http://localhost:3000/**（推荐，同源），或直接双击 `index.html`。

### 4. 使用

1. 点左上角「登录」→「注册」创建账号（密码至少 6 位）
2. 点「＋ 新建手账」开始创作
3. 保存（选封面 + 署名/种类/心情/天气）后回到首页，点击卡片查看/编辑，或点右下角 × 删除

## ⚙️ 配置（环境变量）

后端通过环境变量配置。敏感配置（数据库密码）建议放 `server/.env`（已加入 `.gitignore`），服务启动时会自动读取。

| 变量 | 说明 | 默认 |
|---|---|---|
| `PORT` | 服务端口 | `3000` |
| `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` | MySQL 连接 | `localhost` / `root` / 空（需在 `.env` 设置） |
| `JWT_SECRET` | JWT 密钥 | `bygone-dev-secret-change-me` |
| `WECHAT_APPID` / `WECHAT_SECRET` | 微信开放平台 AppID / Secret | 空（未配置） |
| `WECHAT_REDIRECT` | 微信回调地址 | `http://localhost:3000/api/wechat/callback` |

## 🔐 微信登录说明

微信「网站应用」登录需要：

1. 在[微信开放平台](https://open.weixin.qq.com)创建「网站应用」，拿到 **AppID / AppSecret**（需**企业资质**）
2. 配置**已备案公网域名**为回调（`localhost` 不可用）
3. 设置 `WECHAT_APPID`、`WECHAT_SECRET`、`WECHAT_REDIRECT` 后重启服务

未配置时，点「微信扫码登录」会提示未配置；账号密码登录不受影响。

## 📝 注意事项

- **本地 vs 云端**：登录前（IndexedDB）和登录后（MySQL）是两套独立数据，暂不自动同步
- **网易云接口**：使用非官方 API，仅供个人学习演示，随时可能失效
- **安全**：JWT 密钥、MySQL 密码等默认值仅用于本地开发，上线前务必更换
- **媒体大小**：图片/音频以 base64 存库，超大音频可能受 MySQL `max_allowed_packet` 限制

## 🗺 路线图

详见 [完善清单.md](完善清单.md)。当前待办（P1）：「那年今日」、情绪回顾、导出长图分享、多页手账、本地↔云端同步。
