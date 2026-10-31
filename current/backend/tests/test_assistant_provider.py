from app.services import assistant


def test_provider_chat_endpoint_accepts_base_and_full_urls():
    assert assistant.provider_chat_endpoint("https://api.example.test") == "https://api.example.test/v1/chat/completions"
    assert assistant.provider_chat_endpoint("https://api.example.test/v1") == "https://api.example.test/v1/chat/completions"
    assert assistant.provider_chat_endpoint("https://api.example.test/v1/chat/completions") == "https://api.example.test/v1/chat/completions"
    assert assistant.provider_chat_endpoint("not-a-url") == ""


def test_response_content_accepts_text_and_content_blocks():
    assert assistant.response_content({"choices": [{"message": {"content": "  已收到  "}}]}) == "已收到"
    assert assistant.response_content({"choices": [{"message": {"content": [{"text": "第一段"}, {"text": "第二段"}]}}]}) == "第一段第二段"
    assert assistant.response_content({"choices": []}) == ""


def test_generate_reply_uses_server_side_openai_compatible_proxy(monkeypatch):
    captured = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "请先核对空域和现场风况。"}}]}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured.update(kwargs)
        return Response()

    monkeypatch.setattr(assistant.settings, "MODEL_PROVIDER_URL", "https://api.example.test")
    monkeypatch.setattr(assistant.settings, "MODEL_PROVIDER_API_KEY", "test-only-secret")
    monkeypatch.setattr(assistant.settings, "MODEL_PROVIDER_MODEL", "deepseek-v4-flash")
    monkeypatch.setattr(assistant.httpx, "post", fake_post)

    answer = assistant.generate_reply(
        [{"role": "user", "content": "现在可以起飞吗？"}],
        "飞前检查",
        {"aircraft_model": "Mavic 3", "city": "北京", "task": "电力巡检"},
    )

    assert answer == "请先核对空域和现场风况。"
    assert captured["url"] == "https://api.example.test/v1/chat/completions"
    assert captured["json"]["model"] == "deepseek-v4-flash"
    assert captured["json"]["messages"][0]["role"] == "system"
    assert '"aircraft_model": "Mavic 3"' in captured["json"]["messages"][0]["content"]
    assert '"city": "北京"' in captured["json"]["messages"][0]["content"]
    assert "test-only-secret" not in str(captured["json"])
