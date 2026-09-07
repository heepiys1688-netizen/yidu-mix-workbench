#!/bin/bash
# ============================================
# 时光机智能体混剪工作台 - 一键部署到 GitHub
# ============================================
# 使用方法:
#   1. 确保 git 已安装
#   2. 运行: ./deploy-to-github.sh
#   3. 按提示输入 GitHub Personal Access Token
# ============================================

set -e

PROJECT_NAME="time-machine-workbench"
REPO_NAME="time-machine-workbench"
REPO_DESC="时光机智能体混剪工作台 V1.0 - FastAPI + Vue3 + Element Plus"

echo "============================================"
echo "  时光机智能体混剪工作台 - GitHub 部署脚本"
echo "============================================"
echo ""

# --- Step 1: Get GitHub Token ---
echo "[1/5] 请输入 GitHub Personal Access Token"
echo "      获取地址: https://github.com/settings/tokens/new"
echo "      需勾选权限: repo (完整仓库读写)"
echo ""
read -s -p "      Token (输入不可见): " GH_TOKEN
echo ""

if [ -z "$GH_TOKEN" ]; then
  echo "❌ Token 不能为空"
  exit 1
fi

# --- Step 2: Get GitHub username ---
echo "[2/5] 请输入你的 GitHub 用户名"
read -p "      用户名: " GH_USER
echo ""

# --- Step 3: Create GitHub repo via API ---
echo "[3/5] 正在创建 GitHub 仓库..."
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/gh_create.json \
  -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false}")

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ 仓库创建成功: https://github.com/$GH_USER/$REPO_NAME"
elif [ "$HTTP_CODE" = "422" ]; then
  echo "⚠️  仓库已存在，将直接推送代码"
else
  echo "❌ 创建仓库失败 (HTTP $HTTP_CODE)"
  cat /tmp/gh_create.json
  exit 1
fi

# --- Step 4: Configure remote and push ---
echo ""
echo "[4/5] 正在推送代码到 GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$REPO_NAME.git"
git push -u origin main
echo "✅ 代码推送完成"

# --- Step 5: Clean up ---
git remote set-url origin "https://github.com/$GH_USER/$REPO_NAME.git"
echo ""
echo "[5/5] 清理完成，Token 已从 remote URL 中移除"
echo ""
echo "============================================"
echo "  🎉 部署成功!"
echo "============================================"
echo ""
echo "  仓库地址: https://github.com/$GH_USER/$REPO_NAME"
echo "  克隆命令: git clone https://github.com/$GH_USER/$REPO_NAME.git"
echo ""
echo "--- 可选: 部署到 Render.com (免费) ---"
echo "  1. 打开 https://render.com 并注册/登录"
echo "  2. 点击 New → Web Service"
echo "  3. 连接你的 GitHub 账号，选择 $REPO_NAME 仓库"
echo "  4. 配置:"
echo "     Root Directory: backend"
echo "     Build Command:  pip install -r requirements.txt"
echo "     Start Command:  python main.py"
echo "  5. 添加环境变量:"
echo "     PYTHON_VERSION = 3.12.3"
echo "     HOST = 0.0.0.0"
echo "     PORT = 8080"
echo "  6. 点击 Create Web Service"
echo "  7. 等待构建完成，获得公网访问地址"
echo ""
echo "  注意: Render 免费版会在 15 分钟无访问后休眠"
echo "        首次访问唤醒需等待 ~30 秒"
echo "============================================"
