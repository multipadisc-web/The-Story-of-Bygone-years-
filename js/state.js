/* ============================================================
   全局状态与数据（必须最先加载）
   ============================================================ */

// 登录状态（会话级，关闭浏览器即退出）
let authToken = sessionStorage.getItem('bygone_token') || '';
let authUsername = sessionStorage.getItem('bygone_user') || '';

// 顶栏
const bar = document.getElementById('bar');

// 画廊滚动入场
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold:0.12, rootMargin:'0px 0px -6% 0px' });

// 轻提示
let toastTimer;

/* ---------- 编辑器 DOM 引用 ---------- */
const editor = document.getElementById('editor');
const editorPage = document.getElementById('editorPage');
const textbar = document.getElementById('textbar');
const fontSelect = document.getElementById('fontSelect');
const sizeRange = document.getElementById('sizeRange');
const stickerPanel = document.getElementById('stickerPanel');
const stickerGrid = document.getElementById('stickerGrid');
const panelTabs = document.getElementById('panelTabs');
const importBtn = document.getElementById('importBtn');
const importInput = document.getElementById('importInput');
const radiusWrap = document.getElementById('radiusWrap');
const radiusRange = document.getElementById('radiusRange');
const musicPanel = document.getElementById('musicPanel');
const musicClose = document.getElementById('musicClose');
const audioBtn = document.getElementById('audioBtn');
const recordBtn = document.getElementById('recordBtn');
const audioInput = document.getElementById('audioInput');
const sizeWrap = document.getElementById('sizeWrap');
const colorWrap = document.getElementById('colorWrap');
const textColor = document.getElementById('textColor');
const lineHeightWrap = document.getElementById('lineHeightWrap');
const lineHeightSelect = document.getElementById('lineHeightSelect');
const letterSpacingWrap = document.getElementById('letterSpacingWrap');
const letterSpacingRange = document.getElementById('letterSpacingRange');
const bringFront = document.getElementById('bringFront');
const sendBack = document.getElementById('sendBack');
const songSearch = document.getElementById('songSearch');
const searchBtn = document.getElementById('searchBtn');
const songResults = document.getElementById('songResults');
const loginBtn = document.getElementById('loginBtn');
const loginBox = document.getElementById('loginBox');
const loginQr = document.getElementById('loginQr');
const trimWrap = document.getElementById('trimWrap');
const trimTrack = document.getElementById('trimTrack');
const trimSelection = document.getElementById('trimSelection');
const trimStartHandle = document.getElementById('trimStartHandle');
const trimEndHandle = document.getElementById('trimEndHandle');
const trimTime = document.getElementById('trimTime');
const drawCanvas = document.getElementById('drawCanvas');
const drawbar = document.getElementById('drawbar');
const brushSize = document.getElementById('brushSize');
const eraserBtn = document.getElementById('eraserBtn');
const ctx = drawCanvas.getContext('2d');

// 编辑器状态
let activeTool = 'text';
let selected = null, selectedType = 'text';
let currentCat = 'all';
const importedImages = [];
let strokes = [];
let drawColor = '#000000';
let isErase = false;
let drawing = false;
let currentStroke = null;

/* ---------- SVG 贴纸生成 ---------- */
function svgEl(inner, defs){ return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + (defs || '') + inner + '</svg>'; }
function svgDataUrl(svg){ return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); }

/* 写实质感：柔和投影 + 竖向受光渐变 */
const SHADOW = '<filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.8" stdDeviation="2.4" flood-color="#000000" flood-opacity="0.16"/></filter>';
function paperDefs(color){
  return '<defs>' + SHADOW
    + '<linearGradient id="p" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>'
    + '<stop offset="0.35" stop-color="' + color + '"/>'
    + '<stop offset="1" stop-color="' + color + '"/>'
    + '</linearGradient></defs>';
}
const shadowDefs = '<defs>' + SHADOW + '</defs>';

const stickyNotes = ['#F3E3A8','#F0C9C7','#C9E0C2','#C5D9EC','#D8CCE8','#F0E2C8'].map(c => ({
  layer:'paper',
  svg: svgEl('<g filter="url(#s)"><rect x="14" y="10" width="72" height="72" rx="2.5" fill="url(#p)"/><path d="M58 82 L86 82 L86 54 Z" fill="rgba(0,0,0,0.07)"/><path d="M58 82 L86 54" stroke="rgba(0,0,0,0.05)" stroke-width="1"/></g>', paperDefs(c))
}));
const tapes = ['#E8A0AE','#A8D8DC','#EFD894','#B7D8B0','#CBB0DC','#BCC6C6'].map(c => ({
  layer:'paper',
  svg: svgEl('<g filter="url(#s)"><path d="M8 42 L94 36 L93 60 L7 66 Z" fill="' + c + '" opacity="0.8"/><path d="M8 52 L94 46 L93 49 L7 55 Z" fill="#ffffff" opacity="0.22"/></g>', shadowDefs)
}));
const shapes = [
  { svg: svgEl('<g filter="url(#s)"><path d="M50 84 C20 60 12 42 12 28 C12 16 22 10 32 10 C42 10 48 18 50 24 C52 18 58 10 68 10 C78 10 88 16 88 28 C88 42 80 60 50 84 Z" fill="#E08A8A"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><path d="M50 84 C20 60 12 42 12 28 C12 16 22 10 32 10 C42 10 48 18 50 24 C52 18 58 10 68 10 C78 10 88 16 88 28 C88 42 80 60 50 84 Z" fill="#F0C0BC"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><path d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z" fill="#EFD894"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><circle cx="50" cy="50" r="8" fill="#E8B57A"/><g fill="#E8A0AE"><ellipse cx="50" cy="30" rx="9" ry="14"/><ellipse cx="50" cy="70" rx="9" ry="14"/><ellipse cx="30" cy="50" rx="14" ry="9"/><ellipse cx="70" cy="50" rx="14" ry="9"/></g></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><path d="M20 18 H80 L74 30 L80 42 H20 L26 30 Z" fill="#A8C8E8"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><path d="M30 20 H70 V40 H55 L50 46 L45 40 H30 Z" fill="#CBB0DC"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><rect x="14" y="14" width="72" height="72" rx="4" fill="#ffffff" fill-opacity="0.35" stroke="#9BA6AC" stroke-width="2.5" stroke-dasharray="6 6"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><path d="M12 50 H88" stroke="#AEB8BD" stroke-width="2" stroke-dasharray="4 5"/></g>', shadowDefs) },
  { svg: svgEl('<g filter="url(#s)"><circle cx="50" cy="50" r="30" fill="#EFD894"/><circle cx="50" cy="50" r="12" fill="none" stroke="#E8B57A" stroke-width="2"/></g>', shadowDefs) },
];

const CATEGORIES = {
  note:{ label:'便利贴', items:stickyNotes },
  tape:{ label:'胶带', items:tapes },
  shape:{ label:'贴纸', items:shapes },
  nature:{ label:'花草', items:['🌷','🌸','🌹','🌻','🌿','🍃','🍂','🍁','🍀','🌱','🌾','🌼'] },
  mood:{ label:'情绪', items:['🖤','🥀','🩹','💭','💫','✨','🌙','🌧️','☁️','🌈','⭐','🕯️'] },
  deco:{ label:'装饰', items:['🎀','💌','🧸','🎐','📎','🎈','💎','🔮','🌟','🪐','🎁','🧶'] },
  symbol:{ label:'符号', items:['✿','❀','✧','✦','♡','♥','★','☆','♪','♫','✎','☀'] },
};

// 计时器 / 编辑态
let closeTimer = null;
let editing = null; // { entry, source } 打开已有手账时的编辑态
let toolsTimer = null;

// 录音
let mediaRecorder = null, chunks = [];

// 网易云 API 基地址
const API = 'http://localhost:3000';

// 网易云登录轮询
let loginPolling = null;

// 手画颜色
const DRAW_COLORS = ['#000000','#C2492D','#D99A3D','#0E4D46','#5D4B77','#2F6FBF','#E06B8A'];

// 待保存的条目
let pendingItems = null;

// 封面颜色 / 封面弹窗
const VEILS = ['var(--teal)','var(--rust)','var(--amber)','var(--plum)','var(--moss)','var(--ink)'];
const coverModal = document.getElementById('coverModal');
const coverGrid = document.getElementById('coverGrid');
const coverImport = document.getElementById('coverImport');
const coverInput = document.getElementById('coverInput');
const coverSkip = document.getElementById('coverSkip');
const coverMood = document.getElementById('coverMood');
const coverWeather = document.getElementById('coverWeather');
const gallerySearch = document.getElementById('gallerySearch');
const galleryTags = document.getElementById('galleryTags');

// IndexedDB
const DB_NAME = 'bygone_notes';
const DB_STORE = 'entries';
let _db = null;

// 登录弹窗
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authInfo = document.getElementById('authInfo');
const authTitle = document.getElementById('authTitle');
const authHint = document.getElementById('authHint');
const authUser = document.getElementById('authUser');
const authPass = document.getElementById('authPass');
const authErr = document.getElementById('authErr');
const authSwitch = document.getElementById('authSwitch');
const authSubmit = document.getElementById('authSubmit');
const authLogout = document.getElementById('authLogout');
const authUserName = document.getElementById('authUserName');
let authMode = 'login';

// 心情 / 天气标记（保存到封面弹窗）
const MOODS = ['😊','😌','😢','😡','😴','🥰','😰','🥲'];
const WEATHERS = ['☀️','☁️','🌧️','⛈️','❄️','🌫️','🌈','🌙'];

// 画廊筛选
let galleryFilter = { q:'', tag:'' };
