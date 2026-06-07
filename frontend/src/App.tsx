import { useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  Database,
  FileCheck2,
  LineChart,
  Radar,
  Send,
  Settings2,
  ShieldCheck,
  Trophy
} from "lucide-react";
import { askSandboxAgent, uploadDocument } from "./api/client";
import {
  buildMarketAnalysis,
  findGroupCountEvidence,
  formatMarginRate,
  formatMarketNumber
} from "./analysis/marketAnalysis";
import { buildRuleParameters } from "./analysis/ruleParameters";
import { buildOperationPlan } from "./analysis/simulationPlan";
import { ParameterTable } from "./components/ParameterTable";
import type { AgentChatResponse, DocumentType, DocumentUploadResponse, ParameterCandidate } from "./types";

type SectionId = "import" | "parameters" | "market" | "simulation";

const sidebarItems: Array<{ id: SectionId; label: string; Icon: typeof Database }> = [
  { id: "import", label: "资料导入", Icon: Database },
  { id: "parameters", label: "参数确认", Icon: ClipboardCheck },
  { id: "market", label: "市场分析", Icon: BarChart3 },
  { id: "simulation", label: "方案推演", Icon: Settings2 }
];

const sectionCopy: Record<SectionId, { title: string; description: string }> = {
  import: {
    title: "资料导入",
    description: "规则和市场文件用于提供具体数值；方案推演方法论已内置为默认决策依据。"
  },
  parameters: {
    title: "参数确认",
    description: "低置信度或关键参数必须人工确认，未确认参数不可进入最终推演。"
  },
  market: {
    title: "市场分析",
    description: "按市场容量、组均容量、产品利润和置信度拆解可销售上限。"
  },
  simulation: {
    title: "方案推演",
    description: "方案输出来自内置沙盘推演方法、已确认参数和规则引擎，模型只做解释和辅助读取。"
  }
};

const sectionStatusLabels: Record<SectionId, string> = {
  import: "资料",
  parameters: "校验",
  market: "市场",
  simulation: "推演"
};

const initialParameters: ParameterCandidate[] = [];

const groupCountParameterKey = "market.group_count";
function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("import");
  const [parameters, setParameters] = useState<ParameterCandidate[]>(initialParameters);
  const [uploads, setUploads] = useState<Partial<Record<DocumentType, DocumentUploadResponse>>>({});
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualGroupCount, setManualGroupCount] = useState("");
  const [agentQuestion, setAgentQuestion] = useState("帮我制定第一年方案");
  const [agentAnswer, setAgentAnswer] = useState<AgentChatResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  const unconfirmedCriticalCount = useMemo(
    () =>
      parameters.filter(
        (parameter) => parameter.critical && parameter.status === "requires_confirmation"
      ).length,
    [parameters]
  );
  const confirmedGroupCount = useMemo(() => {
    const manualValue = Number.parseFloat(manualGroupCount);
    if (Number.isFinite(manualValue) && manualValue > 0) {
      return manualValue;
    }

    const parameter = parameters.find(
      (candidate) => candidate.key === groupCountParameterKey && candidate.status === "confirmed"
    );
    if (!parameter) {
      return null;
    }
    const value = Number.parseFloat(parameter.value);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [manualGroupCount, parameters]);
  const marketAnalysis = useMemo(
    () => buildMarketAnalysis(uploads.market, confirmedGroupCount, uploads.rules),
    [confirmedGroupCount, uploads.market, uploads.rules]
  );
  const fourYearMarketPlan = useMemo(() => {
    return ["Y1", "Y2", "Y3", "Y4"].map((year) => {
      const rows = marketAnalysis.rows.filter((row) => row.year === year);
      const bestRow = rows.reduce<(typeof rows)[number] | null>((best, row) => {
        if (row.unitMargin === null) {
          return best;
        }
        return !best || best.unitMargin === null || row.unitMargin > best.unitMargin ? row : best;
      }, null);

      return {
        year,
        bestRow,
        totalCapacity: rows.reduce((sum, row) => sum + row.capacity, 0),
        groupCapacity:
          marketAnalysis.groupCount && rows.length > 0
            ? rows.reduce((sum, row) => sum + row.capacity, 0) / marketAnalysis.groupCount
            : null
      };
    });
  }, [marketAnalysis.groupCount, marketAnalysis.rows]);
  const operationPlan = useMemo(
    () => buildOperationPlan(uploads.rules, marketAnalysis.rows, marketAnalysis.groupCount),
    [marketAnalysis.groupCount, marketAnalysis.rows, uploads.rules]
  );
  const totalFragments =
    (uploads.rules?.fragments.length ?? 0) +
    (uploads.market?.fragments.length ?? 0) +
    (uploads.knowledge?.fragments.length ?? 0);
  const confirmedParameterCount = parameters.filter((parameter) => parameter.status === "confirmed").length;
  const readinessItems = [
    {
      label: "规则参数",
      value: uploads.rules ? "已导入" : "待导入",
      ready: Boolean(uploads.rules),
      Icon: FileCheck2
    },
    {
      label: "市场详单",
      value: uploads.market ? `${marketAnalysis.rows.length} 行` : "待导入",
      ready: marketAnalysis.rows.length > 0,
      Icon: LineChart
    },
    {
      label: "组数确认",
      value: marketAnalysis.groupCount ? `${formatMarketNumber(marketAnalysis.groupCount)} 组` : "待确认",
      ready: Boolean(marketAnalysis.groupCount),
      Icon: ShieldCheck
    },
    {
      label: "预算证据",
      value: operationPlan.linePlanOptions.length > 0 ? `${operationPlan.linePlanOptions.length} 案` : "待推演",
      ready: operationPlan.linePlanOptions.length > 0,
      Icon: Radar
    }
  ];
  function updateParameterStatus(key: string, status: ParameterCandidate["status"]) {
    setParameters((current) =>
      current.map((parameter) => (parameter.key === key ? { ...parameter, status } : parameter))
    );
  }

  function upsertGroupCountParameter(
    value: number,
    status: ParameterCandidate["status"],
    source_file: string,
    source_location: string,
    confidence: number
  ) {
    const groupCountParameter: ParameterCandidate = {
      key: groupCountParameterKey,
      label: "参赛组数",
      value: String(value),
      unit: "组",
      source_file,
      source_location,
      confidence,
      impact: "影响市场总容量折算为组均容量，未确认前不可用于最终推演",
      critical: true,
      status
    };

    setParameters((current) => {
      const existing = current.find((parameter) => parameter.key === groupCountParameterKey);
      if (!existing) {
        return [...current, groupCountParameter];
      }
      return current.map((parameter) =>
        parameter.key === groupCountParameterKey ? groupCountParameter : parameter
      );
    });
  }

  async function handleUpload(file: File | undefined, documentType: DocumentType) {
    if (!file) {
      return;
    }
    setUploadingType(documentType);
    setUploadError(null);
    try {
      const result = await uploadDocument(file, documentType);
      setUploads((current) => ({ ...current, [documentType]: result }));
      if (documentType === "market") {
        addDetectedMarketParameters(result);
      }
      if (documentType === "rules") {
        addDetectedRuleParameters(result);
      }
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "导入失败");
    } finally {
      setUploadingType(null);
    }
  }

  function addDetectedMarketParameters(upload: DocumentUploadResponse) {
    const groupCountEvidence = findGroupCountEvidence(upload.fragments);
    if (!groupCountEvidence) {
      return;
    }

    upsertGroupCountParameter(
      groupCountEvidence.value,
      groupCountEvidence.confidence >= 0.99 ? "confirmed" : "requires_confirmation",
      groupCountEvidence.source_file,
      groupCountEvidence.source_location,
      groupCountEvidence.confidence
    );
  }

  function addDetectedRuleParameters(upload: DocumentUploadResponse) {
    const detectedParameters = buildRuleParameters(upload);
    if (detectedParameters.length === 0) {
      return;
    }

    setParameters((current) => {
      const detectedByKey = new Map(
        detectedParameters.map((detectedParameter) => [detectedParameter.key, detectedParameter])
      );
      const nextParameters = current.map((parameter) => detectedByKey.get(parameter.key) ?? parameter);
      const existingKeys = new Set(nextParameters.map((parameter) => parameter.key));
      for (const detectedParameter of detectedParameters) {
        if (!existingKeys.has(detectedParameter.key)) {
          nextParameters.push(detectedParameter);
          existingKeys.add(detectedParameter.key);
        }
      }
      return nextParameters;
    });
  }

  function confirmDetectedGroupCount() {
    const evidence = findGroupCountEvidence(uploads.market?.fragments ?? []);
    if (!evidence) {
      return;
    }

    upsertGroupCountParameter(
      evidence.value,
      "confirmed",
      evidence.source_file,
      evidence.source_location,
      evidence.confidence
    );
  }

  function confirmManualGroupCount() {
    const value = Number.parseFloat(manualGroupCount);
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    upsertGroupCountParameter(value, "confirmed", "人工输入", "市场分析页", 1);
  }

  async function askAgent(question = agentQuestion) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    setAgentQuestion(trimmedQuestion);
    setAgentLoading(true);
    setAgentError(null);
    try {
      const fragments = [
        ...(uploads.rules?.fragments ?? []),
        ...(uploads.market?.fragments ?? []),
        ...(uploads.knowledge?.fragments ?? [])
      ];
      const marketRows = marketAnalysis.rows.map((row) => ({
        year: row.year,
        product: row.product,
        capacity: row.capacity,
        groupAverageCapacity: row.groupAverageCapacity,
        price: row.price,
        cost: row.cost,
        unitMargin: row.unitMargin,
        marginRate: row.marginRate,
        source: row.source
      }));
      const response = await askSandboxAgent({
        question: trimmedQuestion,
        fragments,
        parameters,
        market_rows: marketRows,
        rule_summary: {
          groupCount: marketAnalysis.groupCount,
          detectedGroupCount: marketAnalysis.detectedGroupCount,
          pendingOcrCount: marketAnalysis.pendingOcrCount,
          firstYearOpening: {
            initialCapital: operationPlan.initialCapital,
            recommendedLine: operationPlan.recommendedLine?.name ?? null,
            recommendedLineCount: operationPlan.recommendedLineCount,
            estimatedY1Capacity: operationPlan.estimatedY1Capacity,
            missingEvidence: operationPlan.missingEvidence
          }
        }
      });
      setAgentAnswer(response);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "智能体请求失败");
    } finally {
      setAgentLoading(false);
    }
  }

  function renderUploadResult(documentType: DocumentType) {
    const result = uploads[documentType];
    if (!result) {
      return <span className="upload-empty">尚未导入</span>;
    }
    const label =
      documentType === "rules" ? "规则文件" : documentType === "market" ? "市场文件" : "补充逻辑资料";
    const statusText =
      result.status === "ocr_pending"
        ? `OCR 待确认 ${result.pending_ocr_count} 处`
        : result.status === "extracted"
          ? `已提取 ${result.fragment_count} 个片段`
          : result.status === "unsupported"
            ? "暂不支持该格式或未提取到文本"
            : "已上传";

    return (
      <div className="upload-result">
        <strong>
          {label}：{result.filename}
        </strong>
        <span>{statusText}</span>
      </div>
    );
  }

  function renderActiveSection() {
    if (activeSection === "import") {
      return (
        <section className="panel import-panel" aria-labelledby="import-title">
          <h3 id="import-title">资料导入</h3>
          <div className="upload-strip">
            <Database size={22} aria-hidden="true" />
            <div>
              <strong>赛题资料解析台</strong>
              <p>支持 Word、PDF、Excel、图片。模糊 OCR 会标记为待确认，不会编造数据；做方案的方法论已经内置。</p>
            </div>
          </div>
          <div className="upload-grid">
            <label className="upload-card">
              <span>导入规则文件</span>
              <small>规则参数、贷款、产线、研发、人工、现金流约束</small>
              <input
                type="file"
                accept=".doc,.docx,.pdf,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.webp,.pptx"
                aria-label="导入规则文件"
                onChange={(event) => void handleUpload(event.currentTarget.files?.[0], "rules")}
              />
              {uploadingType === "rules" ? <em>正在导入...</em> : renderUploadResult("rules")}
            </label>
            <label className="upload-card">
              <span>导入市场文件</span>
              <small>市场容量、市场大小、订单、产品价格、产品利润</small>
              <input
                type="file"
                accept=".doc,.docx,.pdf,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.webp,.pptx"
                aria-label="导入市场文件"
                onChange={(event) => void handleUpload(event.currentTarget.files?.[0], "market")}
              />
              {uploadingType === "market" ? <em>正在导入...</em> : renderUploadResult("market")}
            </label>
          </div>
          {uploadError && (
            <div className="state-panel error-panel" role="alert">
              {uploadError}
            </div>
          )}
        </section>
      );
    }

    if (activeSection === "parameters") {
      return (
        <ParameterTable
          parameters={parameters}
          onConfirm={(key) => updateParameterStatus(key, "confirmed")}
          onReject={(key) => updateParameterStatus(key, "rejected")}
        />
      );
    }

    if (activeSection === "market") {
      const bestMarginRow = marketAnalysis.rows.reduce<(typeof marketAnalysis.rows)[number] | null>(
        (best, row) => {
          if (row.unitMargin === null) {
            return best;
          }
          return !best || best.unitMargin === null || row.unitMargin > best.unitMargin ? row : best;
        },
        null
      );

      return (
        <section className="panel analysis-panel" aria-labelledby="market-title">
          <h3 id="market-title">市场分析</h3>
          {marketAnalysis.pendingOcrCount > 0 && (
            <div className="state-panel warning-panel">
              OCR 待确认 {marketAnalysis.pendingOcrCount} 处，未确认文字不会进入最终方案推演。
            </div>
          )}
          <div className="analysis-grid">
            <div className="analysis-item">
              <span>已解析市场行</span>
              <strong>{marketAnalysis.rows.length}</strong>
              <small>{marketAnalysis.evidenceCount} 个市场证据片段</small>
            </div>
            <div className="analysis-item">
              <span>已确认组数</span>
              <strong>{formatMarketNumber(marketAnalysis.groupCount)}</strong>
              <small>
                {marketAnalysis.groupCount
                  ? "用于计算总容量 / 组数"
                  : marketAnalysis.detectedGroupCount
                    ? `识别候选 ${formatMarketNumber(marketAnalysis.detectedGroupCount)} 组，请到参数确认`
                    : "缺少组数证据"}
              </small>
            </div>
            <div className="analysis-item">
              <span>最高单位毛利</span>
              <strong>{bestMarginRow ? `${bestMarginRow.year} ${bestMarginRow.product}` : "待确认"}</strong>
              <small>{bestMarginRow ? `${formatMarketNumber(bestMarginRow.unitMargin)} / 件` : "缺少价格与成本证据"}</small>
            </div>
          </div>

          <div className="group-confirm-panel" aria-label="参赛组数确认">
            <div>
              <strong>参赛组数确认</strong>
              <p>组数会影响组均容量，确认前不进入最终推演。</p>
            </div>
            <div className="group-confirm-actions">
              {marketAnalysis.groupCount ? (
                <span className="confirmed-chip">已确认 {formatMarketNumber(marketAnalysis.groupCount)} 组</span>
              ) : marketAnalysis.detectedGroupCount ? (
                <button
                  className="action-button confirm-button"
                  type="button"
                  onClick={confirmDetectedGroupCount}
                  aria-label={`确认识别组数 ${formatMarketNumber(marketAnalysis.detectedGroupCount)} 组`}
                >
                  确认识别 {formatMarketNumber(marketAnalysis.detectedGroupCount)} 组
                </button>
              ) : (
                <span className="upload-empty">未识别到组数</span>
              )}
              <label className="manual-group-input">
                <span>手动填写参赛组数</span>
                <input
                  aria-label="手动填写参赛组数"
                  min="1"
                  step="1"
                  type="number"
                  value={manualGroupCount}
                  onChange={(event) => setManualGroupCount(event.currentTarget.value)}
                />
              </label>
              <button
                className="action-button"
                type="button"
                onClick={confirmManualGroupCount}
                aria-label="确认手动组数"
              >
                确认手动组数
              </button>
            </div>
          </div>

          {marketAnalysis.rows.length === 0 ? (
            <div className="state-panel">
              暂无可计算的市场数据。请导入市场订单表，系统会从“年份、产品、供应商参考价格、数量”等列提取容量和售价；成本必须来自规则文件中的产品成本表。
            </div>
          ) : (
            <div className="market-table-wrap">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>年份 / 产品</th>
                    <th>市场容量</th>
                    <th>组均容量</th>
                    <th>售价</th>
                    <th>成本</th>
                    <th>单位毛利</th>
                    <th>毛利率</th>
                    <th>证据来源</th>
                  </tr>
                </thead>
                <tbody>
                  {marketAnalysis.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{`${row.year} / ${row.product}`}</td>
                      <td>{formatMarketNumber(row.capacity)}</td>
                      <td>{formatMarketNumber(row.groupAverageCapacity)}</td>
                      <td>{formatMarketNumber(row.price)}</td>
                      <td>{formatMarketNumber(row.cost)}</td>
                      <td>{formatMarketNumber(row.unitMargin)}</td>
                      <td>{formatMarginRate(row.marginRate)}</td>
                      <td>
                        <span className="evidence-source">{row.source}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="simulation-stack" aria-labelledby="simulation-title">
        <h3 id="simulation-title">方案推演</h3>
        {unconfirmedCriticalCount > 0 && (
          <div className="state-panel warning-panel" role="alert">
            还有 {unconfirmedCriticalCount} 个关键参数需人工确认，未确认参数不可进入最终方案。
          </div>
        )}

        {marketAnalysis.rows.length > 0 && (
          <section className="simulation-card" aria-label="四年市场推演">
            <h4>四年市场推演</h4>
            <div className="market-table-wrap">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>主攻方向</th>
                    <th>总容量</th>
                    <th>组均容量</th>
                    <th>售价</th>
                    <th>材料费</th>
                    <th>单位毛利</th>
                    <th>毛利率</th>
                  </tr>
                </thead>
                <tbody>
                  {fourYearMarketPlan.map((plan) => (
                    <tr key={plan.year}>
                      <td>{plan.year}</td>
                      <td>
                        {plan.bestRow ? `${plan.bestRow.year} / ${plan.bestRow.product}` : "待确认"}
                      </td>
                      <td>{plan.totalCapacity > 0 ? formatMarketNumber(plan.totalCapacity) : "待确认"}</td>
                      <td>{formatMarketNumber(plan.groupCapacity)}</td>
                      <td>{formatMarketNumber(plan.bestRow?.price ?? null)}</td>
                      <td>{formatMarketNumber(plan.bestRow?.cost ?? null)}</td>
                      <td>{formatMarketNumber(plan.bestRow?.unitMargin ?? null)}</td>
                      <td>{formatMarginRate(plan.bestRow?.marginRate ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {marketAnalysis.rows.length > 0 && (
          <section className="simulation-card" aria-label="第一年开局方案">
            <h4>第一年开局方案</h4>
            {operationPlan.missingEvidence.length > 0 && (
              <div className="state-panel warning-panel">
                仍缺 {operationPlan.missingEvidence.join("、")}，缺失项不会被编造。
              </div>
            )}
            <div className="metric-grid">
              <div className="metric">
                <span>初始资本</span>
                <strong>{formatMarketNumber(operationPlan.initialCapital)}</strong>
              </div>
              <div className="metric">
                <span>推荐产线</span>
                <strong>
                  {operationPlan.recommendedLine && operationPlan.recommendedLineCount
                    ? `${operationPlan.recommendedLine.name} × ${operationPlan.recommendedLineCount}`
                    : "待确认"}
                </strong>
              </div>
              <div className="metric">
                <span>Y1 估算产能</span>
                <strong>{formatMarketNumber(operationPlan.estimatedY1Capacity)}</strong>
              </div>
            </div>
            <div className="quarter-grid">
              <div className="quarter-card">
                <h4>开局动作</h4>
                <ul>
                  {operationPlan.openingActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="quarter-card">
                <h4>现金流检查</h4>
                <ul>
                  <li>计划投入：{formatMarketNumber(operationPlan.plannedInvestment)} 元</li>
                  <li>现金缓冲：{formatMarketNumber(operationPlan.cashBuffer)} 元</li>
                  <li>融资额度：{formatMarketNumber(operationPlan.loanCapacity)} 元</li>
                  <li>管理费用：{formatMarketNumber(operationPlan.managementFee)} 元/期</li>
                </ul>
              </div>
              <div className="quarter-card">
                <h4>规则约束</h4>
                <ul>
                  <li>生产线上限：{formatMarketNumber(operationPlan.maxLineLimit)} 条</li>
                  <li>
                    产线节奏：
                    {operationPlan.recommendedLine
                      ? `安装 ${operationPlan.recommendedLine.installCycle} 季，生产 ${operationPlan.recommendedLine.productionCycle} 季`
                      : "待确认"}
                  </li>
                  <li>
                    目标订单：
                    {operationPlan.targetY1Row
                      ? `${operationPlan.targetY1Row.year} / ${operationPlan.targetY1Row.product}`
                      : "待确认"}
                  </li>
                </ul>
              </div>
              <div className="quarter-card">
                <h4>风险检查</h4>
                <ul>
                  {operationPlan.riskChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
            </div>
            {operationPlan.linePlanOptions.length > 0 && (
              <div className="line-plan-section">
                <h4>产线方案对标</h4>
                <div className="market-table-wrap" aria-label="产线方案对标">
                  <table className="market-table line-plan-table">
                    <thead>
                      <tr>
                        <th>产线方案</th>
                        <th>估算产能</th>
                        <th>目标订单</th>
                        <th>广告目标</th>
                        <th>前期费用</th>
                        <th>广告现金</th>
                        <th>广告预算</th>
                        <th>净利润</th>
                        <th>交货前现金</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationPlan.linePlanOptions.map((option) => (
                        <tr key={option.id} className={option.cashPositiveUntilDelivery ? undefined : "warn"}>
                          <td>
                            <strong>
                              {option.lineName} × {option.lineCount}
                            </strong>
                            <small>{option.targetProduct ? `主攻 ${option.targetProduct}` : "主攻待确认"}</small>
                          </td>
                          <td>
                            <strong>{formatMarketNumber(option.estimatedCapacity)}</strong>
                            <small>单线 {formatMarketNumber(option.capacityPerLine)}；{option.capacityFormula}</small>
                          </td>
                          <td>{formatMarketNumber(option.targetOrderQuantity)}</td>
                          <td>{option.targetRank ? `前 ${option.targetRank} 名` : "待确认"}</td>
                          <td>
                            <strong>{formatMarketNumber(option.preDeliveryFeeTotal)}</strong>
                            <small>
                              {option.earlyFees
                                .map((fee) => `${fee.label} ${formatMarketNumber(fee.amount)}`)
                                .join("；")}
                            </small>
                          </td>
                          <td>
                            <strong>{formatMarketNumber(option.adPointCash)}</strong>
                            <small>
                              未融资 {formatMarketNumber(option.adAvailableCashBeforeFinancing)}；短贷到账{" "}
                              {formatMarketNumber(option.plannedLoanDraw)}
                            </small>
                          </td>
                          <td>
                            <strong>可投 {formatMarketNumber(option.reasonableAdAmount)}</strong>
                            <small>
                              所需 {formatMarketNumber(option.requiredAdAmount)}；缺口{" "}
                              {formatMarketNumber(option.adFundingGap)}
                            </small>
                            {option.adBudgetSource && <small>{option.adBudgetSource}</small>}
                          </td>
                          <td>
                            <strong>{formatMarketNumber(option.netProfit)}</strong>
                            {option.profitFormula && <small>{option.profitFormula}</small>}
                          </td>
                          <td>
                            <strong>{option.cashPositiveUntilDelivery ? "保持为正" : "需减线/融资"}</strong>
                            <small>
                              最低 {formatMarketNumber(option.minPreDeliveryCash)}；{option.cashTimeline
                                .map((item) => `${item.quarter} ${formatMarketNumber(item.balance)}`)
                                .join(" / ")}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {marketAnalysis.rows.length > 0 && operationPlan.yearlyDecisions.length > 0 && (
          <section className="simulation-card" aria-label="Y1-Y4 产线策略">
            <h4>Y1-Y4 产线策略</h4>
            <div className="decision-grid">
              {operationPlan.yearlyDecisions.map((decision) => (
                <div className="quarter-card" key={decision.year}>
                  <h4>{decision.year}</h4>
                  <div className="decision-metrics">
                    <span>
                      主攻：
                      <strong>
                        {decision.targetMarket
                          ? `${decision.targetMarket.product} / ${formatMarketNumber(decision.targetMarket.unitMargin)}`
                          : "待确认"}
                      </strong>
                    </span>
                    <span>
                      推荐补线：
                      <strong>
                        {decision.recommendedLineName
                          ? `${decision.recommendedLineName} × ${formatMarketNumber(decision.recommendedNewLineCount)}`
                          : "待确认"}
                      </strong>
                    </span>
                    <span>
                      目标产能：
                      <strong>{formatMarketNumber(decision.targetCapacity)}</strong>
                    </span>
                    <span>
                      产能差额：
                      <strong>{formatMarketNumber(decision.capacityGap)}</strong>
                    </span>
                  </div>
                  {decision.lineMix.length > 0 && (
                    <p className="decision-summary">
                      线型组合：
                      {decision.lineMix
                        .map((item) => `${item.lineName}×${item.count}（${formatMarketNumber(item.capacity)}）`)
                        .join("、")}
                    </p>
                  )}
                  <ul>
                    {decision.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                    {decision.lineComparison.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                    {decision.checks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {marketAnalysis.rows.length === 0 && (
          <div className="state-panel">
            当前还不能输出第一年或后四年运营方案。请先导入规则文件、市场订单和参赛组数；缺少任一关键证据时，系统不会编造产能、毛利或广告决策。
          </div>
        )}

        <section className="simulation-card agent-card" aria-label="沙盘智能体问答">
          <div className="agent-header">
            <span className="agent-avatar" aria-hidden="true">
              <Bot size={22} />
            </span>
            <div>
              <h4>沙盘方案智能体</h4>
              <p>
                基于已导入规则、市场、参数和全局争一指令回答；可问第一年方案、市场选择、四年战略、广告压制、现金流或拆线。
              </p>
            </div>
            <span className="agent-context-chip">
              上下文 {((uploads.rules?.fragments.length ?? 0) + (uploads.market?.fragments.length ?? 0) + (uploads.knowledge?.fragments.length ?? 0)).toLocaleString()} 片段
            </span>
          </div>
          <div className="agent-quick-actions" aria-label="快捷问题">
            {["帮我制定第一年方案", "分析市场选择和广告顺位", "制定四年运营战略", "判断补自动还是补智能"].map((question) => (
              <button
                className="ghost-button"
                type="button"
                key={question}
                onClick={() => void askAgent(question)}
                disabled={agentLoading}
              >
                {question}
              </button>
            ))}
          </div>
          <form
            className="agent-form"
            onSubmit={(event) => {
              event.preventDefault();
              void askAgent();
            }}
          >
            <textarea
              value={agentQuestion}
              onChange={(event) => setAgentQuestion(event.currentTarget.value)}
              rows={3}
              aria-label="向沙盘智能体提问"
              placeholder="例如：这题第一年怎么开局才能争一？市场应该选哪个？广告怎么投才能压制对手？"
            />
            <button className="action-button" type="submit" disabled={agentLoading || !agentQuestion.trim()}>
              <Send size={16} aria-hidden="true" />
              {agentLoading ? "分析中" : "提问"}
            </button>
          </form>
          {agentError && (
            <div className="state-panel error-panel" role="alert">
              {agentError}
            </div>
          )}
          {agentAnswer && (
            <div className="agent-answer">
              <div className="agent-answer-meta">
                <span>任务：{agentAnswer.task}</span>
                <span>模型：{agentAnswer.model}</span>
              </div>
              {agentAnswer.warnings.length > 0 && (
                <div className="state-panel warning-panel">
                  {agentAnswer.warnings.join("；")}
                </div>
              )}
              <pre>{agentAnswer.answer}</pre>
            </div>
          )}
        </section>
      </section>
    );
  }

  const activeCopy = sectionCopy[activeSection];

  return (
    <div className="workbench">
      <aside className="sidebar" aria-label="工作台导航">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            沙
          </span>
          <div>
            <h1>数智化沙盘</h1>
            <p>经营推演指挥台</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="工作区">
          {sidebarItems.map(({ id, label, Icon }) => (
            <button
              className={id === activeSection ? "nav-button nav-button-active" : "nav-button"}
              type="button"
              key={id}
              aria-label={label}
              aria-current={id === activeSection ? "page" : undefined}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              <small>{sectionStatusLabels[id]}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-brief" aria-label="当前推演状态">
          <Trophy size={18} aria-hidden="true" />
          <strong>争一模式</strong>
          <span>规则不脱离，现金不断流，产能不保守。</span>
        </div>
      </aside>

      <main className="main">
        <section className="command-hero" aria-label="沙盘推演总览">
          <div className="command-copy">
            <p className="eyebrow">Competition Command Center</p>
            <h2>企业经营沙盘智能推演</h2>
            <p>
              围绕市场霸主、最高有效产能和现金流不断裂，解析规则与详单，辅助制定 Y1-Y4 运营决策。
            </p>
          </div>
          <div className="command-panel" aria-label="就绪度">
            {readinessItems.map(({ label, value, ready, Icon }) => (
              <div className={ready ? "readiness-card ready" : "readiness-card"} key={label}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="ops-strip" aria-label="关键指标">
          <div>
            <span>证据片段</span>
            <strong>{formatMarketNumber(totalFragments)}</strong>
          </div>
          <div>
            <span>确认参数</span>
            <strong>{formatMarketNumber(confirmedParameterCount)}</strong>
          </div>
          <div>
            <span>待确认关键项</span>
            <strong>{formatMarketNumber(unconfirmedCriticalCount)}</strong>
          </div>
          <div>
            <span>候选方案</span>
            <strong>{formatMarketNumber(operationPlan.linePlanOptions.length)}</strong>
          </div>
        </section>

        <header className="page-header">
          <div>
            <p className="eyebrow">Simulation Workbench</p>
            <h2>{activeCopy.title}</h2>
          </div>
          <p>{activeCopy.description}</p>
        </header>

        {renderActiveSection()}
      </main>
    </div>
  );
}

export default App;
