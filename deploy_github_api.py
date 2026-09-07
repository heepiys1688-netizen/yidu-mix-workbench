#!/usr/bin/env python3
"""
时光机智能体混剪工作台 - GitHub 一键部署脚本
使用 Contents API (api.github.com) 上传文件，绕过慢速 git push
"""

import requests
import base64
import json
import os
import sys
import time
from pathlib import Path

# GitHub API base
API = "https://api.github.com"

# Files to upload (relative to project root)
FILES = [
    ".gitignore",
    "README.md",
    "render.yaml",
    "start.bat",
    "backend/main.py",
    "backend/database.py",
    "backend/task_service.py",
    "backend/ai_service.py",
    "backend/requirements.txt",
    "frontend/index.html",
    "frontend/css/style.css",
    "frontend/js/app.js",
    "data/avatars/default.svg",
]

def get_token():
    """Get GitHub token from user input"""
    print("=" * 50)
    print("  时光机智能体混剪工作台 - GitHub 部署")
    print("=" * 50)
    print()
    print("获取 Token: https://github.com/settings/tokens/new")
    print("勾选权限: repo (完整仓库读写)")
    print()
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        print(f"✅ 检测到环境变量中的 Token")
        return token
    token = input("请粘贴你的 GitHub Token: ").strip()
    if not token:
        print("❌ Token 不能为空")
        sys.exit(1)
    return token

def get_user(token):
    """Get authenticated user info"""
    r = requests.get(f"{API}/user", headers=auth_headers(token), timeout=10)
    r.raise_for_status()
    return r.json()

def auth_headers(token):
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

def create_repo(token, username, repo_name):
    """Create a new GitHub repository"""
    print(f"\n[1/3] 创建仓库 {username}/{repo_name} ...")
    r = requests.post(
        f"{API}/user/repos",
        headers=auth_headers(token),
        json={
            "name": repo_name,
            "description": "时光机智能体混剪工作台 V1.0 - FastAPI + Vue3 + Element Plus",
            "private": False,
            "auto_init": False,
        },
        timeout=15,
    )
    if r.status_code == 201:
        print(f"✅ 仓库创建成功: https://github.com/{username}/{repo_name}")
    elif r.status_code == 422:
        print(f"⚠️  仓库已存在，将直接上传文件")
    else:
        print(f"❌ 创建失败 (HTTP {r.status_code}): {r.text}")
        sys.exit(1)

def upload_file(token, username, repo_name, file_path, content_b64, commit_msg):
    """Upload a single file via Contents API"""
    r = requests.put(
        f"{API}/repos/{username}/{repo_name}/contents/{file_path}",
        headers=auth_headers(token),
        json={
            "message": commit_msg,
            "content": content_b64,
        },
        timeout=15,
    )
    return r.status_code in (200, 201)

def upload_all_files(token, username, repo_name, project_dir):
    """Upload all project files via Contents API"""
    total = len(FILES)
    print(f"\n[2/3] 上传 {total} 个文件 ...")
    success = 0
    failed = []

    for i, rel_path in enumerate(FILES, 1):
        abs_path = os.path.join(project_dir, rel_path)
        if not os.path.exists(abs_path):
            print(f"  [{i}/{total}] ⚠️  跳过(不存在): {rel_path}")
            failed.append(rel_path)
            continue

        with open(abs_path, "rb") as f:
            content_b64 = base64.b64encode(f.read()).decode("utf-8")

        ok = upload_file(token, username, repo_name, rel_path, content_b64, f"add: {rel_path}")
        if ok:
            print(f"  [{i}/{total}] ✅ {rel_path}")
            success += 1
        else:
            print(f"  [{i}/{total}] ❌ {rel_path}")
            failed.append(rel_path)
        time.sleep(0.3)  # Rate limit friendliness

    print(f"\n  结果: {success}/{total} 成功")
    if failed:
        print(f"  失败文件: {', '.join(failed)}")
    return success, failed

def main():
    token = get_token()
    user = get_user(token)
    username = user["login"]
    repo_name = "time-machine-workbench"
    project_dir = os.path.dirname(os.path.abspath(__file__))

    print(f"\n  用户: {username}")
    print(f"  仓库: {repo_name}")
    print(f"  项目: {project_dir}")

    create_repo(token, username, repo_name)
    success, failed = upload_all_files(token, username, repo_name, project_dir)

    print(f"\n[3/3] 完成!")
    print("=" * 50)
    print(f"  🎉 仓库地址: https://github.com/{username}/{repo_name}")
    print(f"  📦 上传文件: {success} 个")
    print("=" * 50)
    print()
    print("--- 可选: 部署到 Render.com (免费) ---")
    print("  1. https://render.com → New → Web Service")
    print(f"  2. 连接 GitHub，选择 {repo_name}")
    print("  3. Root Directory: backend")
    print("  4. Build:  pip install -r requirements.txt")
    print("  5. Start:  python main.py")
    print("  6. 环境变量: HOST=0.0.0.0  PORT=8080")
    print("=" * 50)

if __name__ == "__main__":
    main()
