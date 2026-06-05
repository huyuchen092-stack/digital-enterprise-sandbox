import httpx
from pydantic import BaseModel

from app.core.config import settings


class ChatMessage(BaseModel):
    role: str
    content: str


class LLMProvider:
    async def chat(self, messages: list[ChatMessage]) -> str:
        raise NotImplementedError


class DeepSeekProvider(LLMProvider):
    async def chat(self, messages: list[ChatMessage]) -> str:
        if not settings.deepseek_api_key:
            return '{"parameters":[],"warnings":["DEEPSEEK_API_KEY 未配置，使用空参数结果"]}'

        payload = {
            "model": settings.deepseek_model,
            "messages": [message.model_dump() for message in messages],
            "temperature": 0.1,
        }
        headers = {"Authorization": f"Bearer {settings.deepseek_api_key}"}
        async with httpx.AsyncClient(base_url=settings.deepseek_base_url, timeout=60) as client:
            response = await client.post("/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
