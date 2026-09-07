"""
时光机智能体混剪工作台 - FastAPI 主应用
"""
import os
import sys
# Inject pip global path so subprocess can find httpx etc.
_pip_path = "/tmp/.pip-global/lib/python3.12/site-packages"
if _pip_path not in sys.path:
    sys.path.insert(0, _pip_path)
import json
import shutil
import asyncio
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import uvicorn

# 确保模块路径
sys.path.insert(0, os.path.dirname(__file__))

from database import get_db, init_db, gen_id, DATA_DIR
from task_service import submit_task, get_task_status, list_tasks, retry_task, update_task, append_log
from ai_service import ai_rewrite_text, ai_extract_text, ai_generate_cover

app = FastAPI(title="时光机智能体混剪工作台", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务 - 数据目录
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# 前端静态文件
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


# ==================== 认证 ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ? AND password = ?",
                        (req.username, req.password)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    return {"token": f"tk_{user['id']}_{user['username']}", "user": {"id": user["id"], "username": user["username"], "role": user["role"]}}

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="用户名已存在")
    conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (req.username, req.password))
    conn.commit()
    conn.close()
    return {"message": "注册成功"}


# ==================== Dashboard ====================

@app.get("/api/dashboard/stats")
async def dashboard_stats():
    conn = get_db()
    today = __import__("datetime").date.today().isoformat()
    video_count = conn.execute("SELECT COUNT(*) as cnt FROM tasks WHERE task_type IN ('ip_video_generate','mix_batch_generate') AND status='completed' AND created_at LIKE ?", (f"{today}%",)).fetchone()["cnt"]
    queue_count = conn.execute("SELECT COUNT(*) as cnt FROM tasks WHERE status IN ('queued','running')").fetchone()["cnt"]
    material_count = conn.execute("SELECT COUNT(*) as cnt FROM materials").fetchone()["cnt"]
    account_count = conn.execute("SELECT COUNT(*) as cnt FROM matrix_accounts").fetchone()["cnt"]
    conn.close()
    return {
        "videos_today": video_count,
        "queue_tasks": queue_count,
        "materials": material_count,
        "accounts": account_count
    }

@app.get("/api/dashboard/latest-tasks")
async def latest_tasks():
    conn = get_db()
    rows = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ==================== IP Agent ====================

class ExtractTextRequest(BaseModel):
    url: str

class RewriteRequest(BaseModel):
    text: str
    persona: str = "知识博主"
    custom_prompt: str = ""

class GenerateAudioRequest(BaseModel):
    text: str
    voice_id: str = ""
    speed: float = 1.0
    emotion: str = "neutral"

class GenerateVideoRequest(BaseModel):
    text: str
    voice_id: str = ""
    avatar_id: str = ""
    subtitle_template: str = "标准字幕"
    bgm_path: str = ""
    resolution: str = "1080p"
    dodge: bool = True

class GenerateCoverRequest(BaseModel):
    title: str
    template: str = "科技感封面"

@app.post("/api/ip-agent/extract-text")
async def extract_text(req: ExtractTextRequest):
    result = await ai_extract_text(req.url)
    return result

@app.post("/api/ip-agent/rewrite-text")
async def rewrite_text(req: RewriteRequest):
    result = await ai_rewrite_text(req.text, req.persona, req.custom_prompt)
    return result

@app.post("/api/ip-agent/generate-audio")
async def generate_audio(req: GenerateAudioRequest):
    # 模拟TTS生成
    audio_id = gen_id()
    audio_path = os.path.join(DATA_DIR, "voices", f"{audio_id}.wav")
    duration = max(3, len(req.text) * 0.15)
    import subprocess
    try:
        subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo", "-t", str(duration), "-q:a", "9", audio_path], capture_output=True, timeout=30)
    except Exception:
        Path(audio_path).touch()
    return {"audio_id": audio_id, "audio_path": f"/data/voices/{audio_id}.wav", "duration": duration}

@app.post("/api/ip-agent/generate-video")
async def generate_video(req: GenerateVideoRequest):
    task_id = submit_task("ip_video_generate", req.model_dump())
    return {"task_id": task_id}

@app.post("/api/ip-agent/generate-cover")
async def generate_cover(req: GenerateCoverRequest):
    svg = await ai_generate_cover(req.title, req.template)
    cover_id = gen_id()
    cover_path = os.path.join(DATA_DIR, "covers", f"{cover_id}.svg")
    with open(cover_path, "w", encoding="utf-8") as f:
        f.write(svg)
    return {"cover_id": cover_id, "cover_path": f"/data/covers/{cover_id}.svg", "svg": svg}


# ==================== Mix Agent ====================

class MixTaskRequest(BaseModel):
    mix_mode: str = "random"
    material_ids: List[str] = []
    output_count: int = 1
    bgm_path: str = ""
    subtitle_template: str = ""
    resolution: str = "1080p"
    script_data: str = ""
    template_id: str = ""

@app.post("/api/mix-agent/create-mix-task")
async def create_mix_task(req: MixTaskRequest):
    task_id = submit_task("mix_batch_generate", req.model_dump())
    return {"task_id": task_id}

@app.get("/api/mix-agent/task-progress/{task_id}")
async def mix_progress(task_id: str):
    task = get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

@app.get("/api/mix-agent/download/{task_id}")
async def mix_download(task_id: str):
    task = get_task_status(task_id)
    if not task or task["status"] != "completed":
        raise HTTPException(status_code=400, detail="任务未完成")
    files = json.loads(task["output_files"]) if task["output_files"] else []
    if not files:
        raise HTTPException(status_code=404, detail="无输出文件")
    return FileResponse(files[0], media_type="video/mp4", filename=f"{task_id}.mp4")


# ==================== Material Library ====================

@app.post("/api/material/upload-chunk")
async def upload_chunk(file: UploadFile = File(...), chunkIndex: int = Form(0), totalChunks: int = Form(1), fileName: str = Form(...)):
    upload_dir = os.path.join(DATA_DIR, "uploads")
    temp_path = os.path.join(upload_dir, f"{fileName}.part{chunkIndex}")
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    return {"chunkIndex": chunkIndex, "uploaded": True}

@app.post("/api/material/merge-chunk")
async def merge_chunk(fileName: str = Form(...), totalChunks: int = Form(...), fileType: str = Form("video"), folderId: str = Form("")):
    upload_dir = os.path.join(DATA_DIR, "uploads")
    mid = gen_id()
    ext = os.path.splitext(fileName)[1] or ".mp4"
    final_path = os.path.join(upload_dir, f"{mid}{ext}")

    with open(final_path, "wb") as outfile:
        for i in range(totalChunks):
            part_path = os.path.join(upload_dir, f"{fileName}.part{i}")
            if os.path.exists(part_path):
                with open(part_path, "rb") as f:
                    outfile.write(f.read())
                os.remove(part_path)

    # 获取文件信息
    size = os.path.getsize(final_path)
    duration = 0
    if fileType == "video":
        try:
            import subprocess
            result = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", final_path], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                import json as _json
                info = _json.loads(result.stdout)
                duration = float(info.get("format", {}).get("duration", 0))
        except Exception:
            pass

    conn = get_db()
    conn.execute("""INSERT INTO materials (id, name, type, size, duration, path, folder_id, source)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'local')""",
                 (mid, fileName, fileType, size, duration, final_path, folderId or None))
    conn.commit()
    conn.close()
    return {"id": mid, "name": fileName, "path": final_path, "size": size, "duration": duration}

@app.get("/api/material/list")
async def material_list(page: int = 1, page_size: int = 20, type: str = None, folder_id: str = None, keyword: str = None):
    conn = get_db()
    offset = (page - 1) * page_size
    query = "SELECT * FROM materials"
    conditions = []
    params = []
    if type:
        conditions.append("type = ?")
        params.append(type)
    if folder_id:
        conditions.append("folder_id = ?")
        params.append(folder_id)
    if keyword:
        conditions.append("name LIKE ?")
        params.append(f"%{keyword}%")
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([page_size, offset])
    rows = conn.execute(query, params).fetchall()
    total = conn.execute("SELECT COUNT(*) as cnt FROM materials" + (" WHERE " + " AND ".join(conditions) if conditions else ""), params[:-2] if conditions else []).fetchone()["cnt"]
    folders = conn.execute("SELECT * FROM folders").fetchall()
    conn.close()
    return {"items": [dict(r) for r in rows], "total": total, "folders": [dict(f) for f in folders]}

class FolderRequest(BaseModel):
    name: str
    parent_id: str = ""

@app.post("/api/material/folder/create")
async def create_folder(req: FolderRequest):
    fid = gen_id()
    conn = get_db()
    conn.execute("INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)",
                 (fid, req.name, req.parent_id or None))
    conn.commit()
    conn.close()
    return {"id": fid, "name": req.name}

class TagRequest(BaseModel):
    material_id: str
    tag: str

@app.post("/api/material/tag/add")
async def add_tag(req: TagRequest):
    conn = get_db()
    row = conn.execute("SELECT tags FROM materials WHERE id = ?", (req.material_id,)).fetchone()
    tags = []
    if row:
        tags = json.loads(row["tags"]) if row["tags"] else []
        if req.tag not in tags:
            tags.append(req.tag)
        conn.execute("UPDATE materials SET tags = ? WHERE id = ?", (json.dumps(tags, ensure_ascii=False), req.material_id))
        conn.commit()
    conn.close()
    return {"tags": tags}

@app.delete("/api/material/{material_id}")
async def delete_material(material_id: str):
    conn = get_db()
    row = conn.execute("SELECT path FROM materials WHERE id = ?", (material_id,)).fetchone()
    if row and row["path"] and os.path.exists(row["path"]):
        os.remove(row["path"])
    conn.execute("DELETE FROM materials WHERE id = ?", (material_id,))
    conn.commit()
    conn.close()
    return {"deleted": True}

class WebSearchRequest(BaseModel):
    keyword: str
    type: str = "video"

@app.post("/api/material/web-search")
async def web_search(req: WebSearchRequest):
    # 模拟全网素材搜索结果
    results = []
    for i in range(1, 9):
        results.append({
            "id": f"web_{i}",
            "title": f"{req.keyword}_素材_{i}",
            "type": req.type,
            "duration": 10 + i * 3 if req.type == "video" else None,
            "size": f"{i*2}MB",
            "thumbnail": f"/data/avatars/default.svg",
            "source": "全网搜索",
            "copyright_notice": "仅供创意参考，商用请获取版权方授权"
        })
    return {"items": results, "notice": "素材仅供创意参考，商用请获取版权方授权"}

class SaveWebMaterialRequest(BaseModel):
    url: str = ""
    name: str
    type: str = "video"

@app.post("/api/material/save-web-material")
async def save_web_material(req: SaveWebMaterialRequest):
    task_id = submit_task("web_material_download", {"url": req.url, "name": req.name, "type": req.type})
    return {"task_id": task_id}

class VideoSplitRequest(BaseModel):
    material_id: str

@app.post("/api/material/video-split")
async def video_split(req: VideoSplitRequest):
    conn = get_db()
    row = conn.execute("SELECT * FROM materials WHERE id = ?", (req.material_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="素材不存在")

    # 模拟镜头切分
    segments = []
    for i in range(1, 4):
        seg_id = gen_id()
        segments.append({
            "id": seg_id,
            "name": f"{row['name']}_镜头{i}",
            "start": (i-1) * 5,
            "end": i * 5,
            "type": "video"
        })
    return {"segments": segments, "source": row["name"]}


# ==================== Voice Clone ====================

class VoiceCloneRequest(BaseModel):
    name: str
    sample_path: str = ""

@app.post("/api/voice-clone/create")
async def voice_clone(req: VoiceCloneRequest):
    task_id = submit_task("voice_clone_task", req.model_dump())
    return {"task_id": task_id}

@app.get("/api/voice-clone/list")
async def voice_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM voices ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/api/voice-clone/{voice_id}")
async def delete_voice(voice_id: str):
    conn = get_db()
    conn.execute("DELETE FROM voices WHERE id = ?", (voice_id,))
    conn.commit()
    conn.close()
    return {"deleted": True}


# ==================== Avatar ====================

@app.get("/api/avatar/list")
async def avatar_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM avatars ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/avatar/upload-custom")
async def upload_avatar(name: str = Form(...), file: UploadFile = File(...)):
    aid = gen_id()
    ext = os.path.splitext(file.filename)[1] or ".png"
    img_path = os.path.join(DATA_DIR, "avatars", f"{aid}{ext}")
    content = await file.read()
    with open(img_path, "wb") as f:
        f.write(content)
    task_id = submit_task("avatar_train_task", {"name": name, "image_path": img_path})
    return {"task_id": task_id, "avatar_id": aid}

@app.delete("/api/avatar/{avatar_id}")
async def delete_avatar(avatar_id: str):
    conn = get_db()
    conn.execute("DELETE FROM avatars WHERE id = ?", (avatar_id,))
    conn.commit()
    conn.close()
    return {"deleted": True}


# ==================== Matrix Account ====================

class AccountRequest(BaseModel):
    platform: str
    account_name: str
    credentials: str = "{}"
    group_name: str = ""

@app.post("/api/matrix-account/add")
async def add_account(req: AccountRequest):
    aid = gen_id()
    conn = get_db()
    conn.execute("INSERT INTO matrix_accounts (id, platform, account_name, credentials, group_name) VALUES (?, ?, ?, ?, ?)",
                 (aid, req.platform, req.account_name, req.credentials, req.group_name))
    conn.commit()
    conn.close()
    return {"id": aid}

@app.get("/api/matrix-account/list")
async def account_list():
    conn = get_db()
    rows = conn.execute("SELECT * FROM matrix_accounts ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/matrix-account/test-connect/{account_id}")
async def test_connect(account_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM matrix_accounts WHERE id = ?", (account_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="账号不存在")
    # 模拟连通测试
    import random
    success = random.random() > 0.3
    conn = get_db()
    conn.execute("UPDATE matrix_accounts SET status = ? WHERE id = ?",
                 ("connected" if success else "failed", account_id))
    conn.commit()
    conn.close()
    return {"connected": success, "platform": row["platform"], "account": row["account_name"]}

@app.delete("/api/matrix-account/{account_id}")
async def delete_account(account_id: str):
    conn = get_db()
    conn.execute("DELETE FROM matrix_accounts WHERE id = ?", (account_id,))
    conn.commit()
    conn.close()
    return {"deleted": True}


# ==================== Template ====================

@app.get("/api/template/list")
async def template_list(category: str = None):
    conn = get_db()
    if category:
        rows = conn.execute("SELECT * FROM templates WHERE category = ? ORDER BY created_at DESC", (category,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM templates ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

class TemplateRequest(BaseModel):
    name: str
    category: str
    config: str = "{}"

@app.post("/api/template/save-custom")
async def save_template(req: TemplateRequest):
    tid = gen_id()
    conn = get_db()
    conn.execute("INSERT INTO templates (id, name, category, config, is_custom) VALUES (?, ?, ?, ?, 1)",
                 (tid, req.name, req.category, req.config))
    conn.commit()
    conn.close()
    return {"id": tid}


# ==================== Task Center ====================

@app.get("/api/task/list")
async def task_list(page: int = 1, page_size: int = 20, task_type: str = None, status: str = None):
    tasks, total = list_tasks(page, page_size, task_type, status)
    return {"items": tasks, "total": total, "page": page, "page_size": page_size}

@app.get("/api/task/{task_id}/detail")
async def task_detail(task_id: str):
    task = get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

@app.post("/api/task/{task_id}/retry")
async def task_retry(task_id: str):
    success = retry_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"retrying": True}

@app.get("/api/task/{task_id}/log")
async def task_log(task_id: str):
    task = get_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    log_content = task.get("log", "") or "无日志"
    return JSONResponse(
        content={"task_id": task_id, "log": log_content},
        headers={"Content-Disposition": f"attachment; filename={task_id}_log.txt"}
    )


# ==================== Publish ====================

class PublishRequest(BaseModel):
    video_path: str
    title: str
    tags: str = ""
    cover_path: str = ""
    account_ids: List[str] = []

@app.post("/api/publish/create-publish-task")
async def create_publish(req: PublishRequest):
    task_id = submit_task("platform_publish_task", req.model_dump())
    # 同时记录到publish_tasks
    conn = get_db()
    pid = gen_id()
    conn.execute("""INSERT INTO publish_tasks (id, video_path, title, tags, cover_path, account_ids, status)
                     VALUES (?, ?, ?, ?, ?, ?, 'pending')""",
                 (pid, req.video_path, req.title, req.tags, req.cover_path, json.dumps(req.account_ids)))
    conn.commit()
    conn.close()
    return {"task_id": task_id, "publish_id": pid}

@app.get("/api/publish/status/{publish_id}")
async def publish_status(publish_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM publish_tasks WHERE id = ?", (publish_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="发布任务不存在")
    return dict(row)


# ==================== Settings ====================

@app.get("/api/setting/list")
async def get_settings():
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

class SettingRequest(BaseModel):
    key: str
    value: str

@app.post("/api/setting/update")
async def update_setting(req: SettingRequest):
    conn = get_db()
    existing = conn.execute("SELECT key FROM settings WHERE key = ?", (req.key,)).fetchone()
    if existing:
        conn.execute("UPDATE settings SET value = ? WHERE key = ?", (req.value, req.key))
    else:
        conn.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (req.key, req.value))
    conn.commit()
    conn.close()
    return {"updated": True}


# ==================== 前端入口 ====================

@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h1>Frontend not built yet</h1>")

@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_fallback(full_path: str):
    # SPA fallback - serve index.html for all non-API routes
    if full_path.startswith("api/") or full_path.startswith("data/") or full_path.startswith("static/"):
        raise HTTPException(status_code=404)
    html_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    raise HTTPException(status_code=404)


# 启动
def main():
    init_db()
    port = int(os.environ.get("PORT", 8080))
    host = os.environ.get("HOST", "0.0.0.0")
    print("=" * 60)
    print("  时光机智能体混剪工作台 V1.0")
    print(f"  访问地址: http://{host}:{port}")
    print(f"  API文档: http://{host}:{port}/docs")
    print("  Demo账号: demo / demo123")
    print("=" * 60)
    uvicorn.run(app, host=host, port=port)

if __name__ == "__main__":
    main()
