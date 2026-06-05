import json

from app.schemas.documents import ExtractedFragment
from app.schemas.parameters import ParameterCandidate
from app.services.llm import ChatMessage, LLMProvider


SYSTEM_PROMPT = """你是数智化企业经营沙盘规则参数抽取器。
只输出 JSON，不输出解释。
必须遵守：
1. 只能从给定文本抽取候选参数。
2. 不允许编造来源中不存在的数字。
3. 每个参数必须包含 key,label,value,unit,source_file,source_location,confidence,impact,critical。
4. 不确定时降低 confidence，不要猜。
5. 最终经营决策由规则引擎完成，你只能抽取候选参数。"""


class ParameterExtractor:
    def __init__(self, llm: LLMProvider):
        self.llm = llm

    async def extract(self, fragments: list[ExtractedFragment]) -> list[ParameterCandidate]:
        context = "\n".join(
            f"[{f.source_file} {f.source_location} confidence={f.confidence}] {f.text}"
            for f in fragments[:80]
        )
        response = await self.llm.chat(
            [
                ChatMessage(role="system", content=SYSTEM_PROMPT),
                ChatMessage(role="user", content=f"从以下资料抽取沙盘参数：\n{context}"),
            ]
        )
        data = json.loads(response)
        return [ParameterCandidate(**item) for item in data.get("parameters", [])]
