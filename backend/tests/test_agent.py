from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.schemas.agent import AgentChatRequest
from app.schemas.documents import ExtractedFragment
from app.schemas.parameters import ParameterCandidate
from app.services.agent import (
    build_agent_messages,
    detect_agent_task,
    guardrail_agent_answer,
    load_strategy_knowledge,
    normalize_agent_language,
)


def test_detect_agent_task_routes_common_sandbox_questions():
    assert detect_agent_task("帮我制定第一年方案") == "first_year_plan"
    assert detect_agent_task("分析一下市场容量和市场选择") == "market_analysis"
    assert detect_agent_task("四年运营节奏怎么走") == "four_year_strategy"
    assert detect_agent_task("广告怎么压制对手") == "advertising_strategy"
    assert detect_agent_task("帮我跑预算看看这个方案可不可行") == "budget_check"
    assert detect_agent_task("第二年要不要拆自动线换智能") == "line_analysis"


def test_agent_prompt_includes_global_strategy_context_and_uploaded_parameters():
    request = AgentChatRequest(
        question="帮我制定第一年方案",
        parameters=[
            ParameterCandidate(
                key="finance.initial_cash",
                label="初始现金",
                value="500000",
                unit="元",
                source_file="rules.pdf",
                source_location="page 2",
                confidence=0.98,
                impact="现金流与贷款额度",
            )
        ],
        fragments=[
            ExtractedFragment(
                text="自动线 140000 元，安装 1 季，生产 1 季。P2 研发 2 季。ISO9000 认证 1 季。",
                source_file="rules.pdf",
                source_location="page 3",
                confidence=0.95,
                kind="text",
            )
        ],
        market_rows=[
            {
                "year": 1,
                "quarter": 2,
                "market": "国内市场",
                "product": "P2",
                "feature": "T1",
                "capacity": 3800,
                "average_price": 4600,
            }
        ],
    )

    messages, task, warnings = build_agent_messages(request)
    combined = "\n".join(message.content for message in messages)

    assert task == "first_year_plan"
    assert warnings == []
    assert "争第一" in combined
    assert "市场霸主" in combined
    assert "产线数量和实际排产必须分开" in combined
    assert "可生产季=max" in combined
    assert "理论产能、可生产产能、实际排产" in combined
    assert "初级工按边际净收益最优激励" in combined
    assert "1+2交" in combined
    assert "1+2+3交" in combined
    assert "合并覆盖期现金流压力测试" in combined
    assert "预算引擎" in combined
    assert "断流季度" in combined
    assert "finance.initial_cash" in combined
    assert "自动线 140000 元" in combined
    assert "国内市场" in combined


def test_agent_chat_endpoint_returns_offline_guidance_without_deepseek_key(monkeypatch):
    monkeypatch.setattr(settings, "deepseek_api_key", "")

    with TestClient(app) as client:
        response = client.post(
            "/api/agent/chat",
            json={
                "question": "帮我制定第一年方案",
                "fragments": [
                    {
                        "text": "P2 研发 2 季，国内市场开拓 1 季，ISO9000 1 季。",
                        "source_file": "rules.pdf",
                        "source_location": "page 2",
                        "confidence": 0.9,
                        "kind": "text",
                    }
                ],
                "market_rows": [
                    {
                        "year": 1,
                        "quarter": 2,
                        "market": "国内市场",
                        "product": "P2",
                        "capacity": 3800,
                        "average_price": 4600,
                    }
                ],
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "first_year_plan"
    assert data["model"] == "offline-rule-guidance"
    assert "DeepSeek API 未配置" in data["answer"]
    assert "第一年方案" in data["answer"]
    assert "DEEPSEEK_API_KEY 未配置" in data["warnings"][-1]


def test_agent_prioritizes_daxi_case_knowledge_for_daxi_requests():
    request = AgentChatRequest(
        question="帮我制定第一年方案",
        fragments=[
            ExtractedFragment(
                text=(
                    "大喜股份有限公司 公路车XD8 公路车XD9 XD9纪念版。"
                    "传统线100000，自动线400000，智能线520000。"
                ),
                source_file="大喜股份有限公司.docx",
                source_location="rules",
                confidence=0.95,
                kind="text",
            )
        ],
    )

    knowledge, loaded = load_strategy_knowledge(request=request)
    messages, _, _ = build_agent_messages(request)
    combined = "\n".join(message.content for message in messages)

    assert loaded.index("daxi-case-strategy.md") < loaded.index("hebei-2024-framework.md")
    assert "3智能+8传统" in knowledge
    assert "低价传统线规模化" in combined
    assert "强绑定案例剖面" in combined
    assert "forbidden_without_budget" in combined
    assert "8自动线P1速攻" in combined
    assert "自动线是Y1唯一选择" in combined
    assert "材料提前季为1" in combined
    assert "1.2开产" in combined
    assert "安装0季误判为1.1可以直接生产" in combined
    assert "不得套用其他省赛案例" in combined


def test_daxi_guardrail_blocks_unsupported_auto_line_default():
    request = AgentChatRequest(
        question="帮我制定大喜第一年方案",
        fragments=[
            ExtractedFragment(
                text="大喜股份有限公司 XD8 XD9 XD9纪念版 传统线100000 自动线400000 智能线520000",
                source_file="大喜股份有限公司.docx",
                source_location="rules",
                confidence=0.95,
                kind="text",
            )
        ],
    )

    answer, warnings = guardrail_agent_answer(
        request,
        "建议8自动线P1速攻，自动线是Y1唯一选择。",
    )

    assert "模型原始输出已被拦截" in answer
    assert "3智能+8传统" in answer
    assert "不能直接推荐“8自动线P1速攻”" in answer
    assert warnings == ["模型输出触发大喜案例安全拦截：禁止无预算证明推荐8自动/P1速攻。"]


def test_daxi_guardrail_allows_answer_that_compares_required_direction():
    request = AgentChatRequest(
        question="分析大喜方案",
        fragments=[
            ExtractedFragment(
                text="大喜股份有限公司 XD8 XD9 XD9纪念版",
                source_file="大喜股份有限公司.docx",
                source_location="rules",
                confidence=0.95,
                kind="text",
            )
        ],
    )

    raw_answer = "先比较3智能+8传统，再比较自动线速度方案；自动线不能作为默认唯一选择。"
    answer, warnings = guardrail_agent_answer(request, raw_answer)

    assert answer == raw_answer
    assert warnings == []


def test_agent_normalizes_informal_order_language():
    normalized = normalize_agent_language("高广告低产能会让对手捡漏，自己只能吃单。")

    assert "捡漏" not in normalized
    assert "吃单" not in normalized
    assert "承接剩余订单" in normalized
    assert "获取订单" in normalized
