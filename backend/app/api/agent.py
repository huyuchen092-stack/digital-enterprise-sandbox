from fastapi import APIRouter

from app.schemas.agent import AgentChatRequest, AgentChatResponse
from app.services.agent import SandboxAgentService
from app.services.llm import DeepSeekProvider

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/chat", response_model=AgentChatResponse)
async def chat(request: AgentChatRequest) -> AgentChatResponse:
    return await SandboxAgentService(DeepSeekProvider()).chat(request)
