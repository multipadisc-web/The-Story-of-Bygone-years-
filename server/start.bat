@echo off
cd /d %~dp0
echo ============================================
echo   Bygone 后端服务（账号 + 手账云存储 + 网易云）
echo   浏览器直接打开 http://localhost:3000
echo   关掉这个窗口 = 停止服务
echo ============================================
node app.js
pause
