# 时光机智能体混剪工作台 V1.0

> 无需出镜，搭建属于你的短视频内容流水线，一个人撑起完整内容矩阵

## 项目简介

浏览器端一站式 AI 短视频生产 Web 平台，包含两大核心智能体引擎：

- **时光机 IP 口播智能体**：精品数字人口播短视频流水线，五步成片
- **时光机超级混剪矩阵智能体**：6 大混剪模式，批量矩阵铺量生产视频

## 技术栈

| 分层 | 技术方案 | 说明 |
|------|---------|------|
| 前端 | Vue3 + Element-Plus + TailwindCSS | 响应式 PC/移动端，暗色主题 |
| 后端 | Python FastAPI | 异步 Web 服务，自带 Swagger /docs |
| 任务队列 | ThreadPoolExecutor + SQLite | 轻量级异步任务，无需 Celery/RabbitMQ |
| 音视频引擎 | FFmpeg | 视频合成、烧录字幕、音频混音、镜头分割 |
| 数据库 | SQLite | 持久化用户、素材、任务、模板、账号配置 |
| 部署 | Render / Ngrok | 公网浏览器访问 |

## 快速启动

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 初始化数据库

```bash
python database.py
```

### 3. 启动服务

```bash
python main.py
```

### 4. 访问

- 工作台: http://localhost:8080
- API文档: http://localhost:8080/docs
- Demo账号: `demo` / `demo123`

## 功能模块

| 路由 | 页面 | 说明 |
|------|------|------|
| /login | 登录注册页 | 用户名密码注册登录 |
| /dashboard | 首页仪表盘 | 统计数据、快捷入口、最近任务 |
| /ip-agent | IP口播智能体 | 五步精品口播成片流水线 |
| /mix-agent | 超级混剪矩阵 | 6种混剪模式，批量矩阵生产 |
| /material-lib | 素材资源库 | 本地上传、全网搜索、分类标签管理 |
| /voice-clone | 声音克隆管理 | 音色克隆、预览管理 |
| /avatar-manage | 数字人管理 | 内置/自定义数字人管理 |
| /matrix-account | 矩阵账号管理 | 多平台账号凭证管理 |
| /template-center | 模板中心 | 封面/字幕/混剪脚本模板 |
| /task-center | 全局任务中心 | 进度查看、重试、日志复盘 |
| /publish-center | 发布中心 | 草稿管理、多平台发布 |
| /setting | 系统设置 | 存储、API密钥、队列配置 |
| /help | 帮助文档 | 使用教程、部署说明 |

## 使用说明

1. 浏览器访问工作台地址，使用 demo 账号登录
2. 在系统设置填入外部 AI API 密钥（未配置时走本地模拟模式）
3. 导入素材：本地批量上传 或 全网搜索保存
4. 两种工作模式：
   - **IP口播智能体**：粘贴链接→提取文案→AI改写→配音数字人→生成视频
   - **超级混剪矩阵**：选择混剪模式→选定素材池→设置产出数量→批量生成
5. 任务在全局任务中心查看进度，失败可重试
6. 产出视频可下载或绑定矩阵账号直接发布

## 部署方案

### 方案A: Render 免费云部署

1. 推送代码到 GitHub
2. 在 Render 创建 Web Service，选择仓库
3. 构建命令: `cd backend && pip install -r requirements.txt`
4. 启动命令: `cd backend && python main.py`
5. Render 自动分配公网域名

### 方案B: Ngrok 内网穿透

1. 运行 `start.bat` 启动本地服务
2. 运行 `ngrok http 8080`
3. 复制 ngrok 公网地址访问

## 安全与版权

- 全网素材搜索：仅供创意参考，商用请获取版权方授权
- 声音克隆：仅允许克隆本人语音，禁止克隆他人声音
- 数字人：禁止生成伪造人物虚假内容
- 矩阵发布：用户自行填写各平台开发者凭证，系统不内置第三方账号

## 项目结构

```
time-machine-workbench/
├── backend/
│   ├── main.py              # FastAPI 主应用 + 全部 API 路由
│   ├── database.py           # SQLite 数据模型与初始化
│   ├── task_service.py       # 异步任务队列系统
│   ├── ai_service.py         # AI 大模型/TTS/数字人服务对接
│   └── requirements.txt      # Python 依赖
├── frontend/
│   ├── index.html            # 入口 HTML (Vue3 CDN)
│   ├── css/style.css         # 全局暗色主题样式
│   └── js/app.js             # 全部页面组件与路由
├── data/                     # 数据目录 (SQLite + 素材存储)
│   ├── workbench.db
│   ├── uploads/
│   ├── avatars/
│   ├── voices/
│   ├── outputs/
│   └── covers/
├── start.bat                 # Windows 一键启动脚本
├── render.yaml               # Render 部署配置
└── README.md                 # 本文件
```

## API 接口汇总

完整接口文档启动后访问 `/docs`，主要接口：

- **Auth**: login, register
- **Dashboard**: stats, latest-tasks
- **IP-Agent**: extract-text, rewrite-text, generate-audio, generate-video, generate-cover
- **Mix-Agent**: create-mix-task, task-progress, download
- **Material**: upload-chunk, merge-chunk, list, folder/create, tag/add, web-search, save-web-material, video-split
- **Voice-Clone**: create, list, delete
- **Avatar**: list, upload-custom, delete
- **Matrix-Account**: add, list, test-connect, delete
- **Template**: list, save-custom
- **Task**: list, detail, retry, log
- **Publish**: create-publish-task, status
- **Setting**: list, update
