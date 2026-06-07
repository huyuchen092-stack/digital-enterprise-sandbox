from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.agent import AgentChatRequest, AgentChatResponse, AgentTask
from app.schemas.documents import ExtractedFragment
from app.schemas.parameters import ParameterCandidate
from app.services.llm import ChatMessage, LLMProvider


PROJECT_ROOT = Path(__file__).resolve().parents[3]
KNOWLEDGE_DIR = PROJECT_ROOT / "docs" / "knowledge"
GLOBAL_DIRECTIVE = KNOWLEDGE_DIR / "universal-sandbox-strategy-directive.md"
CASE_KNOWLEDGE_FILES = [
    KNOWLEDGE_DIR / "budget-workbook-operating-rules.md",
    KNOWLEDGE_DIR / "hebei-2024-framework.md",
    KNOWLEDGE_DIR / "daxi-case-strategy.md",
    KNOWLEDGE_DIR / "jiangsu-undergraduate-notice-strategy.md",
    KNOWLEDGE_DIR / "liaoning-undergraduate-rule-analysis.md",
    KNOWLEDGE_DIR / "fujian-case-strategy.md",
    KNOWLEDGE_DIR / "dahai-case-strategy.md",
    KNOWLEDGE_DIR / "jilin-tengfei-case-strategy.md",
    KNOWLEDGE_DIR / "gaozhi-provincial-case-strategy.md",
    KNOWLEDGE_DIR / "strategy-hard-rules.md",
]

CASE_RELEVANCE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "daxi-case-strategy.md": ("大喜", "xd8", "xd9", "纪念版", "公路车", "江苏"),
    "budget-workbook-operating-rules.md": ("预算", "跑预算", "广告现金", "材料送货", "补线", "激励", "贴现"),
    "jiangsu-undergraduate-notice-strategy.md": ("江苏", "经营发展指数", "数智化建设", "商誉", "碳中和率"),
    "hebei-2024-framework.md": ("河北", "小羊", "单车"),
    "liaoning-undergraduate-rule-analysis.md": ("辽宁", "锂电池", "r3", "本科赛道"),
    "fujian-case-strategy.md": ("福建", "省赛", "空调", "柜式", "挂式"),
    "dahai-case-strategy.md": ("大海", "科技"),
    "jilin-tengfei-case-strategy.md": ("吉林", "腾飞"),
    "gaozhi-provincial-case-strategy.md": ("高职", "省赛详单"),
}

CASE_PROFILES: dict[str, dict[str, Any]] = {
    "daxi": {
        "display_name": "大喜股份本科案例",
        "knowledge_file": "daxi-case-strategy.md",
        "keywords": ("大喜", "xd8", "xd9", "纪念版", "公路车"),
        "must_consider": [
            "3智能+8传统",
            "低价传统线规模化",
            "少量智能线提前布局",
            "Y3 P3/XD9纪念版高利润爆发",
            "材料提前季为1时，传统线即使安装0季也只能等材料到货后生产；大喜第一批传统线应按1.2开产校验",
            "高广告必须绑定足够可交产能，否则对手会承接剩余订单",
        ],
        "forbidden_without_budget": [
            "8自动线P1速攻",
            "自动线是Y1唯一选择",
            "只因传统线生产周期2季就排除传统线",
            "把传统线安装0季误判为1.1可以直接生产",
            "没有订单价格证据时宣称Y1所有产品亏损",
        ],
        "known_direction": (
            "该类题不能默认套自动线速度套利。必须先比较低价传统线的大规模订单承接能力、"
            "少量智能线对Y3高利润纪念版的提前布局，以及自动线安装快但性价比不足/转产受限的问题。"
        ),
    }
}


TASK_KEYWORDS: list[tuple[AgentTask, tuple[str, ...]]] = [
    ("first_year_plan", ("第一年", "开局", "y1", "首年", "一年方案")),
    ("market_analysis", ("市场分析", "分析市场", "市场选择", "市场报告", "容量", "市场大小")),
    ("four_year_strategy", ("四年", "y1-y4", "y1到y4", "后续运营", "运营节奏", "战略")),
    ("product_analysis", ("产品选择", "产品分析", "毛利", "利润产品", "p1", "p2", "p3", "p4", "p5")),
    ("line_analysis", ("产线", "自动线", "智能线", "传统线", "线型", "补线")),
    ("advertising_strategy", ("广告", "顺位", "排名", "压制", "垄断", "市场霸主")),
    ("budget_check", ("跑预算", "预算跑通", "预算校验", "可不可行", "是否可行", "方案能不能过")),
    ("cashflow_check", ("现金流", "能不能过", "断流", "贴现", "贷款", "短贷")),
    ("line_replacement", ("拆线", "换线", "替换", "拆自动", "补智能")),
]


def detect_agent_task(question: str) -> AgentTask:
    normalized = question.lower().replace(" ", "")
    for task, keywords in TASK_KEYWORDS:
        if any(keyword.lower() in normalized for keyword in keywords):
            return task
    return "general_question"


def _request_search_text(request: AgentChatRequest | None) -> str:
    if request is None:
        return ""
    parts = [request.question, _json_dumps(request.rule_summary), _json_dumps(request.market_rows[:20])]
    parts.extend(fragment.text[:800] for fragment in request.fragments[:20])
    parts.extend(parameter.label + parameter.value for parameter in request.parameters[:80])
    return "\n".join(parts).lower()


def _prioritize_case_knowledge(request: AgentChatRequest | None) -> list[Path]:
    search_text = _request_search_text(request)

    def score(path: Path) -> tuple[int, int]:
        keywords = CASE_RELEVANCE_KEYWORDS.get(path.name, ())
        relevance = sum(1 for keyword in keywords if keyword.lower() in search_text)
        # Keep the original order stable as a tiebreaker.
        original_index = CASE_KNOWLEDGE_FILES.index(path)
        return (-relevance, original_index)

    return sorted(CASE_KNOWLEDGE_FILES, key=score)


def detect_case_profile(request: AgentChatRequest | None) -> tuple[str | None, dict[str, Any] | None]:
    search_text = _request_search_text(request)
    for profile_key, profile in CASE_PROFILES.items():
        if any(keyword.lower() in search_text for keyword in profile["keywords"]):
            return profile_key, profile
    return None, None


def load_strategy_knowledge(
    max_chars: int = 22000,
    request: AgentChatRequest | None = None,
) -> tuple[str, list[str]]:
    chunks: list[str] = []
    loaded: list[str] = []
    _case_key, case_profile = detect_case_profile(request)
    priority_case = case_profile["knowledge_file"] if case_profile else None

    def append_chunk(path: Path, char_limit: int) -> None:
        if not path.exists() or path.name in loaded:
            return
        text = path.read_text(encoding="utf-8", errors="ignore").strip()
        if not text:
            return
        remaining = max_chars - sum(len(chunk) for chunk in chunks)
        if remaining <= 0:
            return
        chunks.append(f"\n\n## {path.name}\n{text[: min(char_limit, remaining)]}")
        loaded.append(path.name)

    # Always reserve enough room for the directly detected case. The previous
    # global-first loading could truncate case knowledge, letting the model fall
    # back to generic line-selection habits.
    append_chunk(GLOBAL_DIRECTIVE, 12000)
    append_chunk(KNOWLEDGE_DIR / "budget-workbook-operating-rules.md", 7000)
    if priority_case:
        append_chunk(KNOWLEDGE_DIR / priority_case, 9000)

    for path in _prioritize_case_knowledge(request):
        append_chunk(path, max_chars)

    return "".join(chunks), loaded


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def _trim_text(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n...[context truncated]"


def summarize_parameters(parameters: list[ParameterCandidate]) -> list[str]:
    lines: list[str] = []
    for parameter in parameters:
        unit = parameter.unit or ""
        lines.append(
            f"- {parameter.key}（{parameter.label}）= {parameter.value}{unit}；"
            f"状态={parameter.status or 'unknown'}；来源={parameter.source_file}:{parameter.source_location}"
        )
    return lines


def summarize_fragments(fragments: list[ExtractedFragment], max_chars: int) -> str:
    if not fragments:
        return "未随请求提供规则/市场原文片段。"

    parts: list[str] = []
    used = 0
    for index, fragment in enumerate(fragments, start=1):
        header = (
            f"\n[片段 {index}] 来源={fragment.source_file} / {fragment.source_location} "
            f"/ kind={fragment.kind} / confidence={fragment.confidence}\n"
        )
        body = fragment.text.strip()
        chunk = header + body
        if used + len(chunk) > max_chars:
            remaining = max_chars - used
            if remaining > 500:
                parts.append(_trim_text(chunk, remaining))
            break
        parts.append(chunk)
        used += len(chunk)
    return "\n".join(parts)


def build_agent_messages(request: AgentChatRequest) -> tuple[list[ChatMessage], AgentTask, list[str]]:
    task = detect_agent_task(request.question)
    case_key, case_profile = detect_case_profile(request)
    knowledge, loaded_knowledge = load_strategy_knowledge(request=request)
    parameter_lines = summarize_parameters(request.parameters)
    fragment_budget = max(4000, request.max_context_chars - len(knowledge) - 6000)
    fragment_text = summarize_fragments(request.fragments, fragment_budget)
    market_rows_text = _json_dumps(request.market_rows[:120]) if request.market_rows else "[]"
    rule_summary_text = _json_dumps(request.rule_summary) if request.rule_summary else "{}"
    warnings: list[str] = []

    if not request.fragments and not request.parameters and not request.market_rows and not request.rule_summary:
        warnings.append("请求未提供已解析规则/市场上下文，回答只能使用全局方法论，不能宣称具体方案已跑通。")

    if any(fragment.kind in {"ocr_pending", "video_index"} for fragment in request.fragments):
        warnings.append("存在 OCR/视频待确认片段，涉及其中参数时必须标注为待核对。")

    case_profile_text = "未识别到强绑定案例。"
    if case_profile:
        case_profile_text = _json_dumps(
            {
                "detected_case": case_key,
                "display_name": case_profile["display_name"],
                "known_direction": case_profile["known_direction"],
                "must_consider": case_profile["must_consider"],
                "forbidden_without_budget": case_profile["forbidden_without_budget"],
            }
        )
        warnings.append(f"已识别案例剖面：{case_profile['display_name']}，输出必须优先按该剖面校验。")

    system_prompt = f"""
你是“数智化企业经营沙盘方案推演智能体”。

最高目标：在规则允许范围内争第一，成为关键市场霸主；现金流安全是底线，不是目标上限。

你必须严格遵守：
1. 只能基于导入规则、市场详单、用户提供参数和全局指令推理；缺参数必须标注未知，不能编造。
2. 回答必须围绕用户问题，不输出空板块。
3. 产线数量和实际排产必须分开：先测产能上限，再用现金流控制产量。
4. 产品选择必须包含资质研发周期、市场开拓周期、ISO认证周期、产品出现时间、材料到货、特性成本。
5. 广告压制必须绑定可交产能；高广告低产能不是垄断，会让对手承接剩余订单。
6. 现金流必须扣除材料、工资、计件、激励、广告、市场/ISO/资质、贷款/贴现、税费。
7. 自动/智能/传统产线选择必须比较安装期、生产周期、转产、满激励真实产能、后续高利润产品剩余季数。
8. 材料送货期必须与产线安装期、产品资质、员工到岗一起匹配：建成季不等于可生产季；可生产季=max(建成季、资质完成季、材料到货季、员工到岗季)。
9. 产能必须分为理论产能、可生产产能、实际排产；不能把基础产量或平均产能当成可销售产能。
10. 激励必须做边际计算：高级工权重高，通常优先测满100%；初级工影响通常除以4，必须计算新增产能×单件现金毛利是否覆盖激励、材料、计件和现金流压力。
11. 每套候选方案至少考虑三档激励：不激励/保现金，高级工满激励，初级工按边际净收益最优激励。
12. 激励取舍必须结合市场大小：大市场更偏产能，中/小市场先保证广告顺位；初级工激励若会挤掉补线、材料或广告，必须比较“先上线下季再激励高级工”的方案。
12a. 补线通常优先于初级工激励；只有当新增初级工激励产能的现金毛利显著高于补线/广告/材料机会成本时，才选择激励初级工。
12b. 高级工未满激励但能多上一条线时，必须比较“先上线、下一季用交货/贴现现金补高级工激励”的节奏。
13. 广告时点现金必须是扣除建线、资质、材料、生产费、工资、激励、还款、税和安全垫后的可动用现金；除1.2通常无入库贴现外，后续广告季若有一交入库，必须先算交货/贴现后的极限广告额。
13a. 广告现金只代表最多能打多少，不代表应该全打；若达到目标顺位后还有现金，优先检查补线、备料、高级工激励和下一季高利润准备。
14. 三四年若订单少但单量大，必须考虑1+2交、1+2+3交或全年合并申报；广告额必须通过合并覆盖期现金流压力测试，确保交货前每个季度现金为正。
15. 方案优先级按第一年利润、第一年可打广告、达到最高有效产能时间、高利润产品出现前准备度综合判断；最高有效产能不是生产线上限，而是产线/员工/材料/订单/现金都满足的最大可交产能。
16. 输出多个候选时必须列出：第一年利润、第一年广告额/可支撑顺位、第几年第几季度达到最高有效产能、注意事项。
17. 如果用户问第一年方案，必须输出季度动作、订单/市场目标、产线/激励/广告/现金风险、争一逻辑。
18. 如果用户问市场分析，必须输出市场容量、产品毛利、市场大小、顺位、产能覆盖率、垄断/低广告获取订单建议。
19. 如果用户问四年战略，必须输出 Y1-Y4 产线、产品、市场、研发、广告、融资、拆线/补线节奏。
20. 当相关案例知识与通用经验冲突时，优先使用导入参数和相关案例知识；不得套用其他省赛案例。
21. 如果没有预算表/订单详单/现金流逐季计算证据，不允许输出“已跑通”“必选”“唯一选择”等确定话术，只能写“待预算校验”。
22. 如果识别到案例剖面，必须先列出剖面中的 must_consider，并逐项比较；不得输出 forbidden_without_budget 中的结论，除非你给出完整数字预算证明。
23. 如果用户要求跑预算或判断方案是否可行，必须使用预算引擎口径输出：可行/不可行、断流季度、最低现金点、广告时点现金、材料到货付款、生产入库、交货/贴现和合并订单覆盖期现金流。没有预算引擎结果时必须写“待预算校验”。
23a. 将自然语言方案转预算时，必须按“买线→下料→到货付款→员工到岗→生产→入库→广告→交货/贴现→补线/拆线/激励”的动作链拆解；缺任何关键动作时必须标注待确认或用规则默认值。
24. 输出用语必须专业：不要说“吃单、吃市场、吃一点”，改说“获取订单、承接订单、销售、获取市场份额”。

当前任务类型：{task}
""".strip()

    user_context = f"""
# 用户问题
{request.question}

# 已加载全局/案例指令
{", ".join(loaded_knowledge) if loaded_knowledge else "未加载到本地知识文件"}

# 强绑定案例剖面
{case_profile_text}

# 全局与案例指令正文
{knowledge}

# 已确认/候选参数
{chr(10).join(parameter_lines) if parameter_lines else "未随请求提供结构化参数。"}

# 规则摘要 JSON
{rule_summary_text}

# 市场/订单/分析行 JSON
{market_rows_text}

# 导入文件片段
{fragment_text}

# 输出要求
请直接回答用户问题。必须先说明“依据哪些参数/哪些参数缺失”，再给策略结论。
如果是具体方案，必须体现争一和市场霸主思路，而不是只说能过现金流。
若无法确认现金流跑通，必须明确写“未跑通/待预算校验”，并列出还缺哪些参数。
""".strip()

    return [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_context),
    ], task, warnings


def _daxi_guardrail_answer(request: AgentChatRequest, raw_answer: str) -> str:
    return (
        "模型原始输出已被拦截：它给出了与“大喜股份”案例剖面冲突、且没有预算证明的产线结论。\n\n"
        "按当前已学习的全局指令，大喜这类题必须先比较：\n"
        "1. 3智能+8传统：低价传统线规模化承接订单，少量智能线提前布局 Y3 P3/XD9纪念版。\n"
        "2. 智能偏多方案：转产灵活、后期更稳，但前期总产能和广告覆盖率可能不够。\n"
        "3. 自动线方案：只有在预算证明其速度优势能覆盖传统线低价大产能与智能线后期优势时，才可推荐。\n\n"
        "因此不能直接推荐“8自动线P1速攻”，也不能说“自动线是Y1唯一选择”。"
        "下一步应按规则和详单重跑预算：线价、安装/生产周期、员工到岗与激励、材料到货、订单价格、广告顺位、贴现/短贷和年末税后现金都要逐季校验。\n\n"
        f"用户问题：{request.question}\n\n"
        "被拦截的模型输出仅作为反例，不进入方案结论。"
    )


def guardrail_agent_answer(request: AgentChatRequest, answer: str) -> tuple[str, list[str]]:
    case_key, _case_profile = detect_case_profile(request)
    answer = normalize_agent_language(answer)
    if case_key != "daxi":
        return answer, []

    normalized = answer.replace(" ", "").lower()
    unsafe_markers = ("8自动", "8条自动", "自动线是y1唯一选择", "自动线是第一年唯一选择", "p1速攻")
    has_required_direction = "3智能" in normalized and "8传统" in normalized
    if any(marker.lower() in normalized for marker in unsafe_markers) and not has_required_direction:
        return _daxi_guardrail_answer(request, answer), [
            "模型输出触发大喜案例安全拦截：禁止无预算证明推荐8自动/P1速攻。"
        ]

    return answer, []


def normalize_agent_language(answer: str) -> str:
    replacements = {
        "吃单": "获取订单",
        "吃市场": "获取市场份额",
        "吃一点": "获取部分订单",
        "吃到": "获取到",
        "吃满": "销售满产",
        "捡漏": "承接剩余订单",
        "嫖单": "低广告获取订单",
    }
    normalized = answer
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return normalized


def offline_agent_answer(request: AgentChatRequest, task: AgentTask) -> str:
    parameter_count = len(request.parameters)
    fragment_count = len(request.fragments)
    market_count = len(request.market_rows)

    task_guidance = {
        "first_year_plan": (
            "第一年方案应先判断题型，再按市场/产品/ISO/资质能否赶上来选目标订单；"
            "先测可建产线和满激励产能上限，再用现金流决定实际排产。"
        ),
        "market_analysis": (
            "市场分析应按年份、季度、市场、产品、特性拆分容量，计算单位毛利、组均容量、"
            "广告顺位和产能覆盖率，区分垄断市场与低广告获取订单市场。"
        ),
        "four_year_strategy": (
            "四年战略应围绕 Y1 跑现金和权益、Y2 扩产、Y3 高毛利产品垄断、Y4 终局权益最大化。"
        ),
        "line_analysis": "产线分析必须比较线价、安装期、生产周期、转产、满激励真实产能和高利润剩余季数。",
        "advertising_strategy": "广告策略必须绑定可交产能；高广告低产能会让对手承接剩余订单。",
        "cashflow_check": "现金流校验必须逐季扣除刚性支出、材料、工资、激励、广告、贷款贴现和税。",
        "budget_check": "预算校验必须调用规则预算口径，输出可行性、断流季度、最低现金点、广告时点现金、交货和贴现结果。",
        "line_replacement": "拆线必须用剩余季数增量毛利覆盖残值损失、重建差价、停产损失和现金压力。",
    }.get(task, "请基于导入参数和全局指令回答，缺参数必须标注未知。")

    return (
        "DeepSeek API 未配置，当前返回规则化离线答复。\n\n"
        f"已接收上下文：参数 {parameter_count} 条、文件片段 {fragment_count} 条、市场行 {market_count} 条。\n\n"
        f"针对你的问题：{request.question}\n\n"
        f"{task_guidance}\n\n"
        "后端智能体已准备好把这些上下文与全局指令一起提交给大模型；配置 DEEPSEEK_API_KEY 后，"
        "它会输出具体方案、市场报告、四年战略或现金流校验。"
    )


class SandboxAgentService:
    def __init__(self, provider: LLMProvider):
        self.provider = provider

    async def chat(self, request: AgentChatRequest) -> AgentChatResponse:
        messages, task, warnings = build_agent_messages(request)
        context_summary = [
            f"task={task}",
            f"fragments={len(request.fragments)}",
            f"parameters={len(request.parameters)}",
            f"market_rows={len(request.market_rows)}",
        ]

        if not settings.deepseek_api_key:
            return AgentChatResponse(
                task=task,
                answer=offline_agent_answer(request, task),
                model="offline-rule-guidance",
                warnings=[*warnings, "DEEPSEEK_API_KEY 未配置，未调用大模型。"],
                context_summary=context_summary,
            )

        answer = await self.provider.chat(messages)
        answer, guardrail_warnings = guardrail_agent_answer(request, answer)
        return AgentChatResponse(
            task=task,
            answer=answer,
            model=settings.deepseek_model,
            warnings=[*warnings, *guardrail_warnings],
            context_summary=context_summary,
        )
