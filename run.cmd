@echo off
chcp 65001 >nul
title Word Atlas - Local Server

cd /d "%~dp0"

echo ========================================================
echo               WORD ATLAS - KHỞI CHẠY ỨNG DỤNG
echo ========================================================
echo.
echo Đang khởi động máy chủ Vite (phát triển)...
echo Ứng dụng chạy tại: http://localhost:5188
echo Nhấn Ctrl+C để dừng server.
echo.

:: Mở trình duyệt web sau 2 giây
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:5188"

:: Khởi chạy Vite dev server
call pnpm run dev

pause
