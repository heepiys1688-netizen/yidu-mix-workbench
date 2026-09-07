"""
AI 服务 - 大模型改写、TTS、数字人 API 对接
支持 OpenAI 兼容接口和百度千帆接口
"""
import os
import json
import asyncio
import urllib.request
import urllib.error
from database import get_db

HAS_HTTPX = False  # httpx not available in sandbox; use urllib instead


def get_setting(key, default=""):
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


async def ai_rewrite_text(text, persona="知识博主", custom_prompt=""):
    """AI改写文案"""
    api_key = get_setting("api_key_llm")
    provider = get_setting("llm_provider", "openai")

    # API Key 格式校验：无效密钥直接走模拟模式
    if not api_key or len(api_key) < 20 or api_key.startswith("sk-test"):
        return _mock_rewrite(text, persona)

    persona_map = {
        "知识博主": "你是一位知识科普博主，语气专业但通俗易懂，善于用类比解释复杂概念",
        "带货口播": "你是一位带货主播，语气热情有感染力，突出产品卖点和用户利益",
        "情感解说": "你是一位情感解说博主，语气温暖细腻，善于引发共鸣和思考",
        "干货科普": "你是一位干货科普创作者，语言精炼信息密集，逻辑清晰条理分明",
        "自定义人设": custom_prompt or "你是一位专业的内容创作者",
    }

    system_prompt = persona_map.get(persona, persona_map["知识博主"])
    user_prompt = f"""请改写以下短视频文案，要求：
1. 保持核心信息不变，用{persona}的风格重新表达
2. 开头3秒必须有强钩子
3. 加入冲突悬念、递进逻辑、案例、情绪共鸣、价值升华
4. 生成新的标题和话题标签
5. 输出JSON格式: {{"title":"标题","content":"改写后正文","tags":["标签1","标签2"]}}

原文案：
{text}"""

    try:
        if provider == "openai":
            return await _call_openai(api_key, system_prompt, user_prompt)
        elif provider == "qianfan":
            return await _call_qianfan(api_key, system_prompt, user_prompt)
    except Exception as e:
        return {"error": str(e), **_mock_rewrite(text, persona)}

    return _mock_rewrite(text, persona)


async def _call_openai(api_key, system_prompt, user_prompt):
    """调用OpenAI兼容接口 (urllib实现)"""
    url = "https://api.openai.com/v1/chat/completions"
    payload = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.8
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _do_request, req, 10)
    data = json.loads(resp)
    content = data["choices"][0]["message"]["content"]
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        return json.loads(content.strip())
    except (json.JSONDecodeError, KeyError):
        return {"title": "AI改写结果", "content": content, "tags": ["AI改写", "短视频"]}


async def _call_qianfan(api_key, system_prompt, user_prompt):
    """调用百度千帆接口 (urllib实现)"""
    url = "https://qianfan.baidubce.com/v2/chat/completions"
    payload = json.dumps({
        "model": "ernie-4.0-8k",
        "messages": [
            {"role": "user", "content": system_prompt + "\n" + user_prompt}
        ]
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")

    loop = asyncio.get_event_loop()
    resp = await loop.run_in_executor(None, _do_request, req, 10)
    data = json.loads(resp)
    content = data["choices"][0]["message"]["content"]
    try:
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        return json.loads(content.strip())
    except (json.JSONDecodeError, KeyError):
        return {"title": "AI改写结果", "content": content, "tags": ["AI改写"]}


def _do_request(req, timeout=10):
    """同步HTTP请求，供线程池调用"""
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8")


def _mock_rewrite(text, persona):
    """无API Key时的模拟改写"""
    title = text[:15] + "..." if len(text) > 15 else text
    return {
        "title": f"【{persona}版】{title}",
        "content": f"🔥 你绝对想不到！{text[:50]}...\n\n这不是普通的分享，这是改变认知的关键时刻。\n\n{persona}视角解读：{text[50:100] if len(text) > 50 else '深入分析每一个细节'}\n\n💡 关注我，获取更多干货内容！",
        "tags": ["#" + persona, "#短视频", "#干货分享", "#热门推荐"]
    }


async def ai_extract_text(url):
    """提取短视频文案 - 模拟实现"""
    return {
        "title": "震惊！99%的人都不知道这个秘密",
        "content": "你知道吗？在这个信息爆炸的时代，真正有价值的内容往往被淹没在噪音之中。今天我要分享的这个秘密，可能会彻底改变你的认知方式。首先，我们需要理解一个核心概念：注意力是最稀缺的资源。其次，高效的学习方法不是看更多内容，而是看更少但更精准的内容。最后，实践是检验真理的唯一标准，看完了就去试试吧！",
        "tags": ["#知识分享", "#认知提升", "#学习方法"],
        "source_url": url
    }


async def ai_generate_cover(title, template="科技感封面"):
    """AI生成封面 - 返回SVG占位"""
    color_map = {
        "科技感封面": ("#16213E", "#F7B733"),
        "简约白底": ("#FFFFFF", "#16213E"),
        "金色质感": ("#F7B733", "#16213E"),
    }
    bg, fg = color_map.get(template, ("#16213E", "#F7B733"))
    safe_title = title[:12].replace("<", "").replace(">", "").replace("&", "")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
<rect width="1280" height="720" fill="{bg}"/>
<text x="640" y="320" font-size="72" font-weight="bold" fill="{fg}" text-anchor="middle" font-family="sans-serif">{safe_title}</text>
<text x="640" y="420" font-size="36" fill="{fg}" text-anchor="middle" font-family="sans-serif">时光机智能体</text>
<rect x="540" y="480" width="200" height="60" rx="30" fill="{fg}" opacity="0.2"/>
<text x="640" y="520" font-size="24" fill="{fg}" text-anchor="middle" font-family="sans-serif">点击观看</text>
</svg>"""
    return svg
