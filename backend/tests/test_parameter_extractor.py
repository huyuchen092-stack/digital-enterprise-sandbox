import json

import pytest

from app.core.config import settings
from app.schemas.documents import ExtractedFragment
from app.services.llm import ChatMessage, DeepSeekProvider, LLMProvider
from app.services.parameter_extractor import SYSTEM_PROMPT, ParameterExtractor


class FakeLLM(LLMProvider):
    async def chat(self, messages: list[ChatMessage]) -> str:
        return json.dumps(
            {
                "parameters": [
                    {
                        "key": "loan.short_rate",
                        "label": "Short loan rate",
                        "value": "0.05",
                        "unit": "ratio",
                        "source_file": "rules.pdf",
                        "source_location": "page 3",
                        "confidence": 0.92,
                        "impact": "Affects quarterly cash flow",
                        "critical": True,
                    }
                ]
            }
        )


@pytest.mark.asyncio
async def test_extract_returns_parameter_candidate_from_llm_json() -> None:
    extractor = ParameterExtractor(FakeLLM())
    fragments = [
        ExtractedFragment(
            text="Short loan rate is 5%.",
            source_file="rules.pdf",
            source_location="page 3",
            confidence=0.98,
        )
    ]

    parameters = await extractor.extract(fragments)

    assert len(parameters) == 1
    assert parameters[0].key == "loan.short_rate"
    assert parameters[0].value == "0.05"
    assert parameters[0].source_file == "rules.pdf"


def test_system_prompt_contains_no_fabrication_and_rule_engine_guards() -> None:
    assert "不允许编造" in SYSTEM_PROMPT
    assert "最终经营决策由规则引擎完成" in SYSTEM_PROMPT


@pytest.mark.asyncio
async def test_deepseek_provider_without_api_key_returns_empty_parameters(monkeypatch) -> None:
    monkeypatch.setattr(settings, "deepseek_api_key", "")

    response = await DeepSeekProvider().chat([ChatMessage(role="user", content="extract")])

    data = json.loads(response)
    assert data["parameters"] == []
