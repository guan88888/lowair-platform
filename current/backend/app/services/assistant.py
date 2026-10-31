import json
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit, urlunsplit

import httpx
from fastapi import HTTPException

from app.core.config import settings


SYSTEM_PROMPT = """你是“低空 AI”，面向无人机飞手、培训机构和企业用户的行业助手。
只提供一般性培训、设备、任务规划和风险提示，不得把空域许可、实时气象、法规适用、维修放行或应急指挥表述为确定结论。
涉及事故、失控、火灾、伤害、恶劣天气或限制空域时，先提示停止或中止风险操作，并要求用户以民航主管部门、当地空管、气象部门、设备手册和现场负责人信息为准。
回答应结合用户问题及当前模式，明确缺少的关键条件；不要索取证件号码、精确位置、飞行日志或其他敏感个人信息。"""


def provider_chat_endpoint(provider_url: str) -> str:
    """Accept an OpenAI-compatible base URL or an explicit chat endpoint."""
    raw = (provider_url or "").strip().rstrip("/")
    if not raw:
        return ""
    parsed = urlsplit(raw)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        return ""
    path = parsed.path.rstrip("/")
    if path.endswith("/chat/completions"):
        return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ""))
    if path.endswith("/v1"):
        path += "/chat/completions"
    else:
        path += "/v1/chat/completions"
    return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ""))


def response_content(payload: Dict[str, Any]) -> str:
    """Extract the text field used by OpenAI-compatible chat-completions APIs."""
    choices = payload.get("choices") or []
    if not choices or not isinstance(choices[0], dict):
        return ""
    content = (choices[0].get("message") or {}).get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        ).strip()
    return ""


def generate_reply(messages: List[dict], mode: str, context: Optional[Dict[str, str]] = None) -> str:
    endpoint = provider_chat_endpoint(settings.MODEL_PROVIDER_URL)
    if not (endpoint and settings.MODEL_PROVIDER_API_KEY and settings.MODEL_PROVIDER_MODEL):
        raise HTTPException(status_code=503, detail={"code": "MODEL_PROVIDER_UNAVAILABLE", "message": "模型服务尚未配置；请使用官方数据源核验空域、气象和紧急事项。"})
    safe_history = [
        {"role": item.get("role", "user"), "content": str(item.get("content", ""))[:8000]}
        for item in messages
        if item.get("role") in {"user", "assistant"} and item.get("content")
    ]
    user_context = {
        key: str(value).strip()[:limit]
        for key, value, limit in (
            ("aircraft_model", (context or {}).get("aircraft_model"), 80),
            ("city", (context or {}).get("city"), 80),
            ("task", (context or {}).get("task"), 500),
        )
        if value and str(value).strip()
    }
    context_prompt = ""
    if user_context:
        context_prompt = "\n用户主动提供的任务上下文（仅作回答参考，不要补全或推断敏感信息）：" + json.dumps(user_context, ensure_ascii=False)

    payload = {
        "model": settings.MODEL_PROVIDER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + "\n当前工作模式：" + (mode or "通用咨询") + context_prompt},
            *safe_history,
        ],
        "temperature": 0.2,
        "max_tokens": settings.MODEL_PROVIDER_MAX_TOKENS,
    }
    try:
        response = httpx.post(
            endpoint,
            json=payload,
            headers={"Authorization": "Bearer " + settings.MODEL_PROVIDER_API_KEY, "Content-Type": "application/json"},
            timeout=settings.MODEL_PROVIDER_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        content = response_content(response.json())
    except httpx.HTTPStatusError as error:
        # Provider responses may contain request traces or implementation
        # details. Keep those server-side and expose only a stable public
        # status to the application client.
        if error.response.status_code == 429:
            raise HTTPException(status_code=429, detail={"code": "MODEL_PROVIDER_RATE_LIMITED", "message": "AI 服务请求较多，请稍后重试。"})
        raise HTTPException(status_code=503, detail={"code": "MODEL_PROVIDER_UNAVAILABLE", "message": "模型服务暂不可用，请稍后重试。"})
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        raise HTTPException(status_code=503, detail={"code": "MODEL_PROVIDER_UNAVAILABLE", "message": "模型服务暂不可用，请稍后重试。"})
    if not content:
        raise HTTPException(status_code=503, detail={"code": "MODEL_PROVIDER_INVALID_RESPONSE", "message": "模型服务未返回有效内容。"})
    return content


def generate_search_assist(keyword: str, category: str, result_titles: List[str]) -> Dict[str, Any]:
    instruction = """你是低空经济平台的搜索助手。你只能理解检索意图和改写关键词，不能虚构平台中存在的商品、岗位、机构、任务或内容。
请严格返回 JSON 对象，字段为 intent（不超过40字）和 suggestions（2到4个短关键词）。建议应围绕无人机行业且避免重复原词。"""
    prompt = {
        "keyword": keyword,
        "category": category,
        "matched_titles": result_titles[:8],
    }
    answer = generate_reply(
        [{"role": "user", "content": instruction + "\n输入：" + json.dumps(prompt, ensure_ascii=False)}],
        "搜索意图理解",
    )
    candidate = answer.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", candidate, re.S)
    if fenced:
        candidate = fenced.group(1)
    else:
        start, end = candidate.find("{"), candidate.rfind("}")
        if start >= 0 and end > start:
            candidate = candidate[start:end + 1]
    try:
        payload = json.loads(candidate)
    except (TypeError, ValueError):
        payload = {"intent": answer[:80], "suggestions": []}
    suggestions = []
    for item in payload.get("suggestions") or []:
        value = str(item).strip()[:40]
        if value and value != keyword and value not in suggestions:
            suggestions.append(value)
    return {
        "intent": str(payload.get("intent") or "已按无人机行业语义理解当前搜索")[:80],
        "suggestions": suggestions[:4],
        "model": settings.MODEL_PROVIDER_MODEL,
        "source": "低空 AI 后端代理",
    }
