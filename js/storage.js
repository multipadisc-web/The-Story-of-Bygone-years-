/* ============================================================
   IndexedDB 本地存储（未登录时使用）
   ============================================================ */

function openDB(){
  return new Promise((resolve, reject) => {
    if (_db){ resolve(_db); return; }
    if (!('indexedDB' in window)){ reject(new Error('no-idb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}
async function dbAddEntry(entry){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function dbGetEntries(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbDeleteEntry(id){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function migrateFromLocalStorage(){
  const legacy = localStorage.getItem('bygone_entries');
  if (!legacy) return;
  let entries = [];
  try { entries = JSON.parse(legacy) || []; } catch(e){}
  if (!Array.isArray(entries) || !entries.length) return;
  try {
    for (const e of entries){ await dbAddEntry(e); }
    localStorage.removeItem('bygone_entries');
    showToast('已把 ' + entries.length + ' 段往事迁到本地数据库');
  } catch(e){ /* 迁移失败则保留 localStorage */ }
}
