/* ============================================================
   账号登录 / 注册 / 微信
   ============================================================ */

function updateLoginButton(){
  const b = document.getElementById('loginNav');
  if (b) b.textContent = authToken ? '👤 ' + authUsername : '登录';
}
function setAuthMode(mode){
  authMode = mode;
  if (mode === 'login'){
    authTitle.textContent = '登录'; authHint.textContent = '登录后，手账会同步到云端数据库';
    authSubmit.textContent = '登录'; authSwitch.textContent = '没有账号？去注册'; authPass.placeholder = '密码';
  } else {
    authTitle.textContent = '注册'; authHint.textContent = '创建一个账号，把往事存到云端';
    authSubmit.textContent = '注册'; authSwitch.textContent = '已有账号？去登录'; authPass.placeholder = '密码（至少 6 位）';
  }
}
function openAuthModal(){
  authErr.textContent = '';
  if (authToken){
    authForm.hidden = true; authInfo.hidden = false; authUserName.textContent = '已登录：' + authUsername;
  } else {
    authForm.hidden = false; authInfo.hidden = true; setAuthMode('login');
  }
  authModal.hidden = false;
}
function closeAuthModal(){ authModal.hidden = true; }
async function doAuth(){
  const username = authUser.value.trim();
  const password = authPass.value;
  if (!username || !password){ authErr.textContent = '请输入用户名和密码'; return; }
  if (authMode === 'register' && password.length < 6){ authErr.textContent = '密码至少 6 位'; return; }
  authSubmit.disabled = true;
  try {
    const r = await fetch(API + (authMode === 'login' ? '/api/login' : '/api/register'), {
      method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ username, password })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok){ authErr.textContent = data.error || '请求失败'; return; }
    authToken = data.token; authUsername = data.username;
    sessionStorage.setItem('bygone_token', authToken);
    sessionStorage.setItem('bygone_user', authUsername);
    closeAuthModal(); updateLoginButton(); renderGallery();
    showToast((authMode === 'login' ? '登录成功' : '注册成功') + ' · ' + authUsername);
  } catch(e){
    authErr.textContent = '无法连接服务器，请先在 server 目录运行 npm start';
  } finally {
    authSubmit.disabled = false;
  }
}
function logout(){
  authToken = ''; authUsername = '';
  sessionStorage.removeItem('bygone_token'); sessionStorage.removeItem('bygone_user');
  closeAuthModal(); updateLoginButton(); renderGallery();
  showToast('已退出登录');
}
