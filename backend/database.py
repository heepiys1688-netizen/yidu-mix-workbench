"""
时光机智能体混剪工作台 - 数据库模型与初始化
SQLite + SQLAlchemy
"""
import sqlite3
import os
import json
import time
import uuid
import shutil

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "workbench.db")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# 确保目录存在
for sub in ["uploads", "avatars", "voices", "outputs", "covers", "thumbnails"]:
    d = os.path.join(DATA_DIR, sub)
    os.makedirs(d, exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # 用户表
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 素材表
    c.execute("""
        CREATE TABLE IF NOT EXISTS materials (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            size INTEGER DEFAULT 0,
            duration REAL DEFAULT 0,
            path TEXT NOT NULL,
            thumbnail TEXT,
            folder_id TEXT,
            tags TEXT DEFAULT '[]',
            source TEXT DEFAULT 'local',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 文件夹表
    c.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            parent_id TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 音色表
    c.execute("""
        CREATE TABLE IF NOT EXISTS voices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sample_path TEXT,
            status TEXT DEFAULT 'ready',
            speed REAL DEFAULT 1.0,
            emotion TEXT DEFAULT 'neutral',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 数字人表
    c.execute("""
        CREATE TABLE IF NOT EXISTS avatars (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            image_path TEXT NOT NULL,
            type TEXT DEFAULT 'preset',
            status TEXT DEFAULT 'ready',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 矩阵账号表
    c.execute("""
        CREATE TABLE IF NOT EXISTS matrix_accounts (
            id TEXT PRIMARY KEY,
            platform TEXT NOT NULL,
            account_name TEXT NOT NULL,
            credentials TEXT DEFAULT '{}',
            group_name TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 模板表
    c.execute("""
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            config TEXT DEFAULT '{}',
            is_custom INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 任务表
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            task_type TEXT NOT NULL,
            status TEXT DEFAULT 'queued',
            progress INTEGER DEFAULT 0,
            input_params TEXT DEFAULT '{}',
            output_files TEXT DEFAULT '[]',
            error_msg TEXT DEFAULT '',
            log TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            finished_at TEXT
        )
    """)

    # 发布任务表
    c.execute("""
        CREATE TABLE IF NOT EXISTS publish_tasks (
            id TEXT PRIMARY KEY,
            video_path TEXT NOT NULL,
            title TEXT NOT NULL,
            tags TEXT DEFAULT '',
            cover_path TEXT,
            account_ids TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending',
            results TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )
    """)

    # 系统设置表
    c.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    # 插入默认数据
    # 默认用户
    c.execute("SELECT COUNT(*) as cnt FROM users")
    if c.fetchone()["cnt"] == 0:
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                  ("demo", "demo123", "admin"))

    # 默认文件夹
    c.execute("SELECT COUNT(*) as cnt FROM folders")
    if c.fetchone()["cnt"] == 0:
        for fname in ["视频素材", "图片素材", "音频BGM", "数字人形象", "成片输出"]:
            fid = str(uuid.uuid4())
            c.execute("INSERT INTO folders (id, name) VALUES (?, ?)", (fid, fname))

    # 默认音色
    c.execute("SELECT COUNT(*) as cnt FROM voices")
    if c.fetchone()["cnt"] == 0:
        for vname, emotion in [("知性女声", "neutral"), ("磁性男声", "neutral"),
                               ("活泼女声", "happy"), ("沉稳男声", "neutral"),
                               ("温柔女声", "warm"), ("激昂男声", "excited")]:
            vid = str(uuid.uuid4())
            c.execute("INSERT INTO voices (id, name, emotion) VALUES (?, ?, ?)",
                      (vid, vname, emotion))

    # 默认数字人
    c.execute("SELECT COUNT(*) as cnt FROM avatars")
    if c.fetchone()["cnt"] == 0:
        for aname in ["商务男A", "商务女A", "知识博主男", "知识博主女",
                       "带货主播女", "情感解说男"]:
            aid = str(uuid.uuid4())
            c.execute("INSERT INTO avatars (id, name, image_path, type) VALUES (?, ?, ?, ?)",
                      (aid, aname, "/data/avatars/default.svg", "preset"))

    # 默认模板
    c.execute("SELECT COUNT(*) as cnt FROM templates")
    if c.fetchone()["cnt"] == 0:
        templates = [
            ("科技感封面", "cover", json.dumps({"style": "tech", "color": "#16213E"})),
            ("简约白底", "cover", json.dumps({"style": "minimal", "color": "#FFFFFF"})),
            ("金色质感", "cover", json.dumps({"style": "gold", "color": "#F7B733"})),
            ("标准字幕", "subtitle", json.dumps({"font": "Noto Sans SC", "size": 32, "color": "#FFFFFF", "stroke": "#000000"})),
            ("大字标题", "subtitle", json.dumps({"font": "Noto Sans SC", "size": 48, "color": "#F7B733", "stroke": "#000000"})),
            ("底部弹幕", "subtitle", json.dumps({"font": "Noto Sans SC", "size": 28, "color": "#FFFFFF", "bg": "rgba(0,0,0,0.6)"})),
            ("钩子-痛点-卖点-CTA", "mix_script", json.dumps({"sections": ["hook", "pain", "selling", "cta"]})),
            ("问题-方案-证明-行动", "mix_script", json.dumps({"sections": ["question", "solution", "proof", "action"]})),
        ]
        for tname, cat, config in templates:
            tid = str(uuid.uuid4())
            c.execute("INSERT INTO templates (id, name, category, config) VALUES (?, ?, ?, ?)",
                      (tid, tname, cat, config))

    # 默认设置
    c.execute("SELECT COUNT(*) as cnt FROM settings")
    if c.fetchone()["cnt"] == 0:
        defaults = {
            "storage_path": DATA_DIR,
            "api_key_llm": "",
            "api_key_tts": "",
            "api_key_digital_human": "",
            "llm_provider": "openai",
            "tts_provider": "baidu",
            "max_concurrent_tasks": "3",
            "default_resolution": "1080p",
            "default_fps": "30",
        }
        for k, v in defaults.items():
            c.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, str(v)))

    conn.commit()
    conn.close()


def gen_id():
    return str(uuid.uuid4())


if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
