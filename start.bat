@echo off
chcp 65001 >nul
title 时光机智能体混剪工作台 V1.0

echo ============================================================
echo   时光机智能体混剪工作台 V1.0
echo   一键启动脚本 (Windows)
echo ============================================================
echo.

REM 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

REM 检查 FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 FFmpeg，视频合成功能将不可用
    echo        请从 https://ffmpeg.org/download.html 下载安装
)

REM 安装依赖
echo [1/3] 安装后端依赖...
cd /d "%~dp0backend"
pip install -r requirements.txt -q

REM 初始化数据库
echo [2/3] 初始化数据库...
python database.py

REM 启动服务
echo [3/3] 启动服务...
echo.
echo ============================================================
echo   访问地址: http://localhost:8080
echo   API文档: http://localhost:8080/docs
echo   Demo账号: demo / demo123
echo ============================================================
echo   按 Ctrl+C 停止服务
echo ============================================================
echo.

python main.py

pause
