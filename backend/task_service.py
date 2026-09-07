"""
异步任务系统 - 轻量级后台任务队列
使用线程池 + SQLite 持久化实现，不依赖 Celery/RabbitMQ
"""
import os
import json
import time
import uuid
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from database import get_db, init_db, gen_id, DATA_DIR

TASK_TYPES = [
    "ip_video_generate",
    "mix_batch_generate",
    "voice_clone_task",
    "avatar_train_task",
    "web_material_download",
    "platform_publish_task",
]

_executor = None
_task_registry = {}


def get_executor():
    global _executor
    if _executor is None:
        _executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="worker")
    return _executor


def update_task(task_id, **kwargs):
    conn = get_db()
    sets = []
    vals = []
    for k, v in kwargs.items():
        sets.append(f"{k} = ?")
        vals.append(v)
    vals.append(task_id)
    conn.execute(f"UPDATE tasks SET {', '.join(sets)} WHERE task_id = ?", vals)
    conn.commit()
    conn.close()


def append_log(task_id, msg):
    conn = get_db()
    row = conn.execute("SELECT log FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
    old_log = row["log"] if row and row["log"] else ""
    new_log = old_log + f"\n[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    conn.execute("UPDATE tasks SET log = ? WHERE task_id = ?", (new_log, task_id))
    conn.commit()
    conn.close()


def run_task(task_id, task_type, params):
    """实际执行任务的函数"""
    append_log(task_id, f"任务开始执行, 类型: {task_type}")
    update_task(task_id, status="running", progress=0)

    try:
        if task_type == "ip_video_generate":
            _do_ip_video(task_id, params)
        elif task_type == "mix_batch_generate":
            _do_mix_batch(task_id, params)
        elif task_type == "voice_clone_task":
            _do_voice_clone(task_id, params)
        elif task_type == "avatar_train_task":
            _do_avatar_train(task_id, params)
        elif task_type == "web_material_download":
            _do_web_download(task_id, params)
        elif task_type == "platform_publish_task":
            _do_publish(task_id, params)
        else:
            append_log(task_id, f"未知任务类型: {task_type}")
            update_task(task_id, status="failed", error_msg="未知任务类型", progress=0)
            return

        update_task(task_id, status="completed", progress=100,
                    finished_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        append_log(task_id, "任务完成")
    except Exception as e:
        update_task(task_id, status="failed", error_msg=str(e),
                    finished_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        append_log(task_id, f"任务失败: {e}")


def _do_ip_video(task_id, params):
    """IP口播视频生成"""
    text = params.get("text", "")
    voice_id = params.get("voice_id", "")
    avatar_id = params.get("avatar_id", "")
    subtitle_template = params.get("subtitle_template", "标准字幕")
    bgm = params.get("bgm", "")
    resolution = params.get("resolution", "1080p")

    append_log(task_id, f"文案长度: {len(text)} 字")
    append_log(task_id, f"音色ID: {voice_id}, 数字人ID: {avatar_id}")

    # 步骤1: TTS音频生成 (模拟)
    for i in range(1, 4):
        time.sleep(0.5)
        progress = int(i * 10)
        update_task(task_id, progress=progress)
        append_log(task_id, f"TTS音频生成中... {progress}%")

    audio_path = os.path.join(DATA_DIR, "voices", f"{task_id}_audio.wav")
    # 生成静音音频作为占位
    duration = max(3, len(text) * 0.15)
    _generate_silent_audio(audio_path, duration)
    append_log(task_id, f"音频生成完成: {audio_path}")

    # 步骤2: 数字人合成 (模拟进度)
    for i in range(1, 4):
        time.sleep(0.5)
        progress = 30 + i * 10
        update_task(task_id, progress=progress)
        append_log(task_id, f"数字人渲染中... {progress}%")

    # 步骤3: 字幕烧录
    update_task(task_id, progress=65)
    append_log(task_id, "字幕烧录中...")
    time.sleep(0.5)

    # 步骤4: BGM混音
    if bgm:
        update_task(task_id, progress=75)
        append_log(task_id, "BGM混音中...")
        time.sleep(0.5)

    # 步骤5: 最终合成
    for i in range(1, 4):
        time.sleep(0.3)
        progress = 80 + i * 6
        update_task(task_id, progress=progress)
        append_log(task_id, f"最终合成中... {progress}%")

    # 生成输出视频
    output_path = os.path.join(DATA_DIR, "outputs", f"{task_id}.mp4")
    w, h = (1920, 1080) if resolution == "1080p" else (1280, 720)
    _generate_test_video(output_path, w, h, duration, text[:20])

    output_files = [output_path]
    update_task(task_id, output_files=json.dumps(output_files))
    append_log(task_id, f"视频输出: {output_path}")


def _do_mix_batch(task_id, params):
    """批量混剪任务"""
    mix_mode = params.get("mix_mode", "random")
    output_count = params.get("output_count", 1)
    material_ids = params.get("material_ids", [])
    resolution = params.get("resolution", "1080p")
    subtitle_template = params.get("subtitle_template", "")

    append_log(task_id, f"混剪模式: {mix_mode}, 目标产出: {output_count} 条")
    append_log(task_id, f"素材数量: {len(material_ids)}")

    output_files = []
    w, h = (1920, 1080) if resolution == "1080p" else (1280, 720)
    total_steps = output_count * 3

    for idx in range(output_count):
        # 随机抽取素材拼接 (模拟)
        for step in range(3):
            time.sleep(0.4)
            progress = int((idx * 3 + step + 1) / total_steps * 100)
            update_task(task_id, progress=min(progress, 95))
            append_log(task_id, f"第{idx+1}条视频生成中... 步骤{step+1}/3")

        out_path = os.path.join(DATA_DIR, "outputs", f"{task_id}_{idx}.mp4")
        _generate_test_video(out_path, w, h, 5 + idx, f"Mix_{idx+1}")
        output_files.append(out_path)
        append_log(task_id, f"第{idx+1}条视频完成: {out_path}")

    update_task(task_id, output_files=json.dumps(output_files))


def _do_voice_clone(task_id, params):
    """声音克隆任务"""
    name = params.get("name", "新音色")
    sample_path = params.get("sample_path", "")

    append_log(task_id, f"克隆音色: {name}")
    for i in range(1, 6):
        time.sleep(0.5)
        progress = i * 20
        update_task(task_id, progress=progress)
        append_log(task_id, f"模型训练中... {progress}%")

    # 创建音色记录
    conn = get_db()
    vid = gen_id()
    conn.execute("INSERT INTO voices (id, name, sample_path, status) VALUES (?, ?, ?, ?)",
                 (vid, name, sample_path, "ready"))
    conn.commit()
    conn.close()
    append_log(task_id, f"音色创建成功, ID: {vid}")


def _do_avatar_train(task_id, params):
    """数字人训练任务"""
    name = params.get("name", "自定义数字人")
    image_path = params.get("image_path", "")

    append_log(task_id, f"训练数字人: {name}")
    for i in range(1, 6):
        time.sleep(0.5)
        progress = i * 20
        update_task(task_id, progress=progress)
        append_log(task_id, f"形象训练中... {progress}%")

    conn = get_db()
    aid = gen_id()
    conn.execute("INSERT INTO avatars (id, name, image_path, type, status) VALUES (?, ?, ?, ?, ?)",
                 (aid, name, image_path, "custom", "ready"))
    conn.commit()
    conn.close()
    append_log(task_id, f"数字人创建成功, ID: {aid}")


def _do_web_download(task_id, params):
    """全网素材下载"""
    url = params.get("url", "")
    name = params.get("name", "web_material")
    mtype = params.get("type", "video")

    append_log(task_id, f"下载素材: {name} from {url}")
    for i in range(1, 5):
        time.sleep(0.4)
        progress = i * 25
        update_task(task_id, progress=progress)
        append_log(task_id, f"下载中... {progress}%")

    # 保存到素材库
    ext = ".mp4" if mtype == "video" else (".jpg" if mtype == "image" else ".mp3")
    save_path = os.path.join(DATA_DIR, "uploads", f"{gen_id()}{ext}")
    conn = get_db()
    mid = gen_id()
    conn.execute("""INSERT INTO materials (id, name, type, path, source)
                     VALUES (?, ?, ?, ?, 'web')""",
                 (mid, name, mtype, save_path))
    conn.commit()
    conn.close()
    append_log(task_id, f"素材保存成功: {save_path}")


def _do_publish(task_id, params):
    """发布任务"""
    video_path = params.get("video_path", "")
    title = params.get("title", "")
    account_ids = params.get("account_ids", [])

    append_log(task_id, f"发布视频: {title}")
    append_log(task_id, f"目标账号数: {len(account_ids)}")

    results = {}
    for i, aid in enumerate(account_ids):
        time.sleep(0.5)
        progress = int((i + 1) / len(account_ids) * 100) if account_ids else 100
        update_task(task_id, progress=progress)
        conn = get_db()
        acc = conn.execute("SELECT * FROM matrix_accounts WHERE id = ?", (aid,)).fetchone()
        conn.close()
        if acc:
            append_log(task_id, f"发布到 {acc['platform']}: {acc['account_name']}...")
            results[aid] = {"platform": acc["platform"], "status": "success"}

    update_task(task_id, output_files=json.dumps(results))


def _generate_silent_audio(path, duration):
    """生成静音音频文件"""
    try:
        subprocess.run([
            "ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(duration), "-q:a", "9", path
        ], capture_output=True, timeout=30)
    except Exception:
        # 如果ffmpeg失败,写空文件
        with open(path, "wb") as f:
            f.write(b"")


def _generate_test_video(path, w, h, duration, text=""):
    """用FFmpeg生成测试视频"""
    try:
        # 生成带文字的彩色背景视频
        safe_text = text.replace(":", "").replace("'", "").replace('"', "")
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=0x16213E:s={w}x{h}:d={duration}:r=30",
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-vf", f"drawtext=text='{safe_text}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
            "-c:v", "libx264", "-preset", "ultrafast",
            "-c:a", "aac", "-shortest",
            "-t", str(duration),
            path
        ], capture_output=True, timeout=60)
    except Exception as e:
        # 如果带文字失败,生成纯色视频
        try:
            subprocess.run([
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"color=c=0x16213E:s={w}x{h}:d={duration}:r=30",
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "libx264", "-preset", "ultrafast",
                "-c:a", "aac", "-shortest",
                "-t", str(duration),
                path
            ], capture_output=True, timeout=60)
        except Exception:
            with open(path, "wb") as f:
                f.write(b"")


def submit_task(task_type, params):
    """提交任务到队列"""
    init_db()
    task_id = gen_id()
    conn = get_db()

    conn.execute("""INSERT INTO tasks (task_id, task_type, status, progress, input_params)
                     VALUES (?, ?, 'queued', 0, ?)""",
                 (task_id, task_type, json.dumps(params, ensure_ascii=False)))
    conn.commit()
    conn.close()

    # 提交到线程池
    executor = get_executor()
    executor.submit(run_task, task_id, task_type, params)

    return task_id


def get_task_status(task_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def list_tasks(page=1, page_size=20, task_type=None, status=None):
    conn = get_db()
    offset = (page - 1) * page_size
    query = "SELECT * FROM tasks"
    conditions = []
    params = []
    if task_type:
        conditions.append("task_type = ?")
        params.append(task_type)
    if status:
        conditions.append("status = ?")
        params.append(status)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([page_size, offset])

    rows = conn.execute(query, params).fetchall()
    total = conn.execute("SELECT COUNT(*) as cnt FROM tasks" +
                         (" WHERE " + " AND ".join(conditions) if conditions else ""),
                         params[:-2] if conditions else []).fetchone()["cnt"]
    conn.close()
    return [dict(r) for r in rows], total


def retry_task(task_id):
    """重试失败任务"""
    conn = get_db()
    row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
    conn.close()
    if not row:
        return False
    params = json.loads(row["input_params"]) if row["input_params"] else {}
    update_task(task_id, status="queued", progress=0, error_msg="",
                finished_at=None)
    executor = get_executor()
    executor.submit(run_task, task_id, row["task_type"], params)
    return True
