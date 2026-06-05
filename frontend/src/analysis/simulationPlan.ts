import type { DocumentUploadResponse } from "../types";
import type { MarketAnalysisRow } from "./marketAnalysis";

export type ProductionLineRule = {
  name: string;
  purchasePrice: number;
  installCycle: number;
  productionCycle: number;
  capacity: number;
  transferCycle: number | null;
  transferPrice: number | null;
};

export type LoanRule = {
  name: string;
  limitMultiplier: number;
  duration: number;
  rate: number;
};

export type ProductDevelopmentRule = {
  product: string;
  cost: number;
  cycles: number;
};

export type YearlyOperationDecision = {
  year: string;
  targetMarket: MarketAnalysisRow | null;
  targetDemand: number | null;
  targetLineCount: number | null;
  newLineCount: number | null;
  targetCapacity: number | null;
  capacityGap: number | null;
  actions: string[];
  checks: string[];
};

export type OperationPlan = {
  missingEvidence: string[];
  initialCapital: number | null;
  recommendedLine: ProductionLineRule | null;
  recommendedLineCount: number | null;
  estimatedY1Capacity: number | null;
  targetY1Row: MarketAnalysisRow | null;
  targetY1Demand: number | null;
  plannedInvestment: number | null;
  cashBuffer: number | null;
  loanCapacity: number | null;
  recommendedLoan: LoanRule | null;
  productDevelopment: ProductDevelopmentRule | null;
  maxLineLimit: number | null;
  managementFee: number | null;
  openingActions: string[];
  riskChecks: string[];
  yearlyDecisions: YearlyOperationDecision[];
};

type HeaderKind =
  | "line_purchase"
  | "loan"
  | "product_development"
  | "fee"
  | "basic_rule";

const text = {
  initialCapital: "\u521d\u59cb\u8d44\u672c",
  lineName: "\u7ebf\u578b\u540d\u79f0",
  purchasePrice: "\u8d2d\u4e70\u4ef7\u683c",
  loanName: "\u8d37\u6b3e\u540d\u79f0",
  productName: "\u4ea7\u54c1\u540d\u79f0",
  developmentCost: "\u6d88\u8017\u91d1\u94b1",
  feeName: "\u8d39\u7528\u540d\u79f0",
  ruleName: "\u89c4\u5219\u540d\u79f0",
  smartLine: "\u667a\u80fd\u7ebf",
  smart: "\u667a\u80fd",
  automatic: "\u81ea\u52a8",
  longTerm: "\u957f\u671f",
  managementFee: "\u7ba1\u7406\u8d39\u7528",
  maxLineLimit: "\u751f\u4ea7\u7ebf\u4e0a\u9650",
  y1Order: "Y1 \u5e02\u573a\u8ba2\u5355",
  groupCount: "\u53c2\u8d5b\u7ec4\u6570"
} as const;

function splitCells(rawText: string) {
  return rawText.split("|").map((cell) => cell.trim());
}

function toNumber(value: string | undefined) {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value.replace(/,/g, "").replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function hasCell(cells: string[], needle: string) {
  return cells.some((cell) => cell.includes(needle));
}

function bestY1Row(rows: MarketAnalysisRow[]) {
  return bestRowForYear(rows, "Y1");
}

function bestRowForYear(rows: MarketAnalysisRow[], year: string) {
  return (
    rows
      .filter((row) => row.year === year && row.unitMargin !== null)
      .sort((left, right) => (right.unitMargin ?? -Infinity) - (left.unitMargin ?? -Infinity))[0] ??
    null
  );
}

function chooseLine(lines: ProductionLineRule[]) {
  return (
    lines.find((line) => line.name.includes(text.smartLine)) ??
    lines.find((line) => line.name.includes(text.smart)) ??
    lines.find((line) => line.name.includes(text.automatic)) ??
    lines[0] ??
    null
  );
}

function chooseLoan(loans: LoanRule[]) {
  return (
    loans.find((loan) => loan.name.includes(text.longTerm)) ??
    [...loans].sort((left, right) => left.rate - right.rate)[0] ??
    null
  );
}

function buildTransferPolicyCheck(line: ProductionLineRule | null) {
  if (!line) {
    return "\u8f6c\u4ea7\u7b56\u7565\u5f85\u4ea7\u7ebf\u53c2\u6570\u9f50\u5168\u540e\u786e\u8ba4";
  }

  const transferPriceText =
    line.transferPrice !== null ? `\uff0c\u8f6c\u4ea7\u4ef7\u683c ${line.transferPrice} \u5143` : "";

  if (line.name.includes(text.automatic)) {
    if (line.transferCycle !== null && line.transferCycle > 0) {
      return `${line.name}\u8f6c\u4ea7\u5468\u671f ${line.transferCycle} \u5b63${transferPriceText}\uff0c\u6309\u89c4\u5219\u4e0d\u8f6c\u4ea7\uff1b\u540e\u7eed\u4ea7\u54c1\u5207\u6362\u4f18\u5148\u65b0\u589e\u6216\u4fdd\u7559\u4e13\u7ebf`;
    }
    if (line.transferCycle === 0) {
      return `${line.name}\u8f6c\u4ea7\u5468\u671f 0 \u5b63${transferPriceText}\uff0c\u53ef\u8f6c\u4ea7\uff0c\u4f46\u8f6c\u4ea7\u524d\u4ecd\u9700\u6838\u5bf9\u4ea7\u80fd\u3001\u8ba2\u5355\u548c\u73b0\u91d1\u6d41`;
    }
    return `${line.name}\u672a\u53d1\u73b0\u8f6c\u4ea7\u5468\u671f\u8bc1\u636e\uff0c\u6309\u53ef\u8f6c\u4ea7\u5904\u7406\uff0c\u6700\u7ec8\u51b3\u7b56\u9700\u590d\u6838\u539f\u89c4\u5219\u8868`;
  }

  if (line.transferCycle !== null) {
    return `${line.name}\u8f6c\u4ea7\u5468\u671f ${line.transferCycle} \u5b63${transferPriceText}\uff0c\u8f6c\u4ea7\u5e94\u7eb3\u5165\u5b63\u5ea6\u73b0\u91d1\u6d41\u548c\u4ea4\u4ed8\u8282\u70b9\u6821\u9a8c`;
  }

  return `${line.name}\u672a\u53d1\u73b0\u8f6c\u4ea7\u5468\u671f\u8bc1\u636e\uff0c\u53ea\u80fd\u4f5c\u4e3a\u5f85\u590d\u6838\u8f6c\u4ea7\u5047\u8bbe`;
}

function buildYearlyDecisions(
  marketRows: MarketAnalysisRow[],
  recommendedLine: ProductionLineRule | null,
  startingLineCount: number | null,
  maxLineLimit: number | null,
  developments: ProductDevelopmentRule[]
): YearlyOperationDecision[] {
  let cumulativeLines = startingLineCount ?? 0;

  return ["Y1", "Y2", "Y3", "Y4"].map((year) => {
    const targetMarket = bestRowForYear(marketRows, year);
    const targetDemand = targetMarket?.groupAverageCapacity ?? null;
    const requiredLines =
      recommendedLine && targetDemand !== null
        ? Math.max(1, Math.ceil(targetDemand / recommendedLine.capacity))
        : null;
    const targetLineCount =
      requiredLines !== null ? Math.min(requiredLines, maxLineLimit ?? requiredLines) : null;
    const newLineCount =
      targetLineCount !== null ? Math.max(0, targetLineCount - cumulativeLines) : null;

    if (targetLineCount !== null) {
      cumulativeLines = Math.max(cumulativeLines, targetLineCount);
    }

    const targetCapacity =
      recommendedLine && targetLineCount !== null ? recommendedLine.capacity * targetLineCount : null;
    const capacityGap =
      targetDemand !== null && targetCapacity !== null ? targetCapacity - targetDemand : null;
    const development = targetMarket
      ? developments.find((item) => item.product === targetMarket.product) ?? null
      : null;

    const actions = [
      targetMarket
        ? `${year} \u4e3b\u653b ${targetMarket.product}\uff0c\u7ec4\u5747\u9700\u6c42 ${targetDemand ?? "\u5f85\u786e\u8ba4"} \u4ef6\uff0c\u5355\u4f4d\u6bdb\u5229 ${targetMarket.unitMargin ?? "\u5f85\u786e\u8ba4"} \u5143`
        : `${year} \u7f3a\u5c11\u5e02\u573a\u8ba2\u5355\uff0c\u4e0d\u751f\u6210\u4e3b\u653b\u65b9\u5411`,
      recommendedLine && targetLineCount !== null
        ? `\u76ee\u6807\u7d2f\u8ba1 ${targetLineCount} \u6761${recommendedLine.name}\uff0c\u76ee\u6807\u4ea7\u80fd ${targetCapacity} \u4ef6\uff0c\u672c\u5e74\u9700\u65b0\u589e ${newLineCount} \u6761`
        : "\u7b49\u5f85\u4ea7\u7ebf\u53c2\u6570\u540e\u8ba1\u7b97\u7d2f\u8ba1\u7ebf\u6570",
      development
        ? `${targetMarket?.product} \u7814\u53d1\u8d39 ${development.cost} \u5143\uff0c\u5468\u671f ${development.cycles} \u5b63\uff0c\u9700\u5361\u5728\u5e02\u573a\u7206\u53d1\u524d\u5b8c\u6210`
        : targetMarket
          ? `${targetMarket.product} \u7814\u53d1\u53c2\u6570\u672a\u9f50\uff0c\u6682\u4e0d\u7f16\u9020\u7814\u53d1\u8282\u594f`
          : "\u5f85\u5e02\u573a\u4e3b\u653b\u4ea7\u54c1\u786e\u8ba4\u540e\u5b89\u6392\u7814\u53d1"
    ];

    const checks = [
      capacityGap !== null
        ? `\u4ea7\u80fd\u5dee\u989d ${capacityGap} \u4ef6\uff1b\u8d1f\u6570\u8868\u793a\u4ea7\u80fd\u4e0d\u8db3\uff0c\u9700\u8c03\u6574\u8d2d\u7ebf\u6216\u5e7f\u544a\u62a2\u5355`
        : "\u4ea7\u80fd\u5dee\u989d\u5f85\u5e02\u573a\u3001\u7ec4\u6570\u548c\u4ea7\u7ebf\u53c2\u6570\u9f50\u5168\u540e\u8ba1\u7b97",
      targetLineCount !== null && maxLineLimit !== null
        ? `\u751f\u4ea7\u7ebf\u4e0a\u9650 ${maxLineLimit} \u6761\uff0c\u672c\u5e74\u7d2f\u8ba1\u7ebf\u6570 ${targetLineCount} \u6761`
        : "\u4ea7\u7ebf\u4e0a\u9650\u5f85\u89c4\u5219\u53c2\u6570\u786e\u8ba4",
      buildTransferPolicyCheck(recommendedLine),
      "\u5e7f\u544a\u6295\u5165\u3001\u5b63\u5ea6\u8d37\u6b3e\u548c\u56de\u6b3e\u8282\u70b9\u9700\u7b49\u73b0\u91d1\u6d41\u660e\u7ec6\u8868\u540e\u505a\u6700\u7ec8\u51b3\u7b56"
    ];

    return {
      year,
      targetMarket,
      targetDemand,
      targetLineCount,
      newLineCount,
      targetCapacity,
      capacityGap,
      actions,
      checks
    };
  });
}

export function buildOperationPlan(
  rulesUpload: DocumentUploadResponse | undefined,
  marketRows: MarketAnalysisRow[],
  groupCount: number | null
): OperationPlan {
  const fragments = rulesUpload?.fragments ?? [];
  let initialCapital: number | null = null;
  let maxLineLimit: number | null = null;
  let managementFee: number | null = null;
  const lines: ProductionLineRule[] = [];
  const loans: LoanRule[] = [];
  const developments: ProductDevelopmentRule[] = [];
  let header: HeaderKind | null = null;

  for (const fragment of fragments) {
    const initialMatch = fragment.text.match(/\u521d\u59cb\u8d44\u672c\s*[:\uff1a]\s*([0-9]+(?:\.[0-9]+)?)/u);
    if (initialMatch) {
      initialCapital = toNumber(initialMatch[1]);
    }

    const cells = splitCells(fragment.text);
    if (cells.length < 2) {
      continue;
    }

    if (hasCell(cells, text.lineName) && hasCell(cells, text.purchasePrice)) {
      header = "line_purchase";
      continue;
    }
    if (hasCell(cells, text.loanName)) {
      header = "loan";
      continue;
    }
    if (hasCell(cells, text.productName) && hasCell(cells, text.developmentCost)) {
      header = "product_development";
      continue;
    }
    if (hasCell(cells, text.feeName)) {
      header = "fee";
      continue;
    }
    if (hasCell(cells, text.ruleName)) {
      header = "basic_rule";
      continue;
    }

    if (header === "line_purchase") {
      const purchasePrice = toNumber(cells[1]);
      const installCycle = toNumber(cells[2]);
      const productionCycle = toNumber(cells[3]);
      const capacity = toNumber(cells[4]);
      const transferCycle = toNumber(cells[5]);
      const transferPrice = toNumber(cells[6]);
      if (cells[0] && purchasePrice !== null && installCycle !== null && productionCycle !== null && capacity !== null) {
        lines.push({
          name: cells[0],
          purchasePrice,
          installCycle,
          productionCycle,
          capacity,
          transferCycle,
          transferPrice
        });
      }
      continue;
    }

    if (header === "loan") {
      const limitMultiplier = toNumber(cells[1]);
      const duration = toNumber(cells[2]);
      const rate = toNumber(cells[4]);
      if (cells[0] && limitMultiplier !== null && duration !== null && rate !== null) {
        loans.push({ name: cells[0], limitMultiplier, duration, rate });
      }
      continue;
    }

    if (header === "product_development") {
      const cost = toNumber(cells[1]);
      const cycles = toNumber(cells[2]);
      if (/^P[1-4]$/u.test(cells[0] ?? "") && cost !== null && cycles !== null) {
        developments.push({ product: cells[0], cost, cycles });
      }
      continue;
    }

    if (header === "fee" && cells[0] === text.managementFee) {
      managementFee = toNumber(cells[1]);
      continue;
    }

    if (header === "basic_rule" && cells[0] === text.maxLineLimit) {
      maxLineLimit = toNumber(cells[1]);
    }
  }

  const targetY1Row = bestY1Row(marketRows);
  const targetY1Demand = targetY1Row?.groupAverageCapacity ?? null;
  const recommendedLine = chooseLine(lines);
  const recommendedLoan = chooseLoan(loans);
  const productDevelopment = targetY1Row
    ? developments.find((development) => development.product === targetY1Row.product) ?? null
    : null;

  const missingEvidence: string[] = [];
  if (initialCapital === null) missingEvidence.push(text.initialCapital);
  if (lines.length === 0) missingEvidence.push("\u4ea7\u7ebf\u53c2\u6570");
  if (loans.length === 0) missingEvidence.push("\u8d37\u6b3e\u53c2\u6570");
  if (managementFee === null) missingEvidence.push(text.managementFee);
  if (maxLineLimit === null) missingEvidence.push(text.maxLineLimit);
  if (!targetY1Row) missingEvidence.push(text.y1Order);
  if (groupCount === null) missingEvidence.push(text.groupCount);

  const demandFitLines =
    recommendedLine && targetY1Demand !== null
      ? Math.max(1, Math.ceil(targetY1Demand / recommendedLine.capacity))
      : null;
  const cashLimitedLines =
    recommendedLine && initialCapital !== null
      ? Math.max(1, Math.floor((initialCapital * 0.55) / recommendedLine.purchasePrice))
      : null;
  const recommendedLineCount =
    demandFitLines !== null && cashLimitedLines !== null
      ? Math.min(demandFitLines, cashLimitedLines, maxLineLimit ?? demandFitLines)
      : null;
  const estimatedY1Capacity =
    recommendedLine && recommendedLineCount !== null ? recommendedLine.capacity * recommendedLineCount : null;
  const plannedInvestment =
    recommendedLine && recommendedLineCount !== null
      ? recommendedLine.purchasePrice * recommendedLineCount + (productDevelopment?.cost ?? 0) + (managementFee ?? 0) * 4
      : null;
  const cashBuffer =
    initialCapital !== null && plannedInvestment !== null ? initialCapital - plannedInvestment : null;
  const loanCapacity =
    initialCapital !== null && recommendedLoan ? initialCapital * recommendedLoan.limitMultiplier : null;

  const openingActions = [
    recommendedLine && recommendedLineCount !== null
      ? `\u8d2d\u4e70 ${recommendedLineCount} \u6761${recommendedLine.name}\uff0c\u57fa\u7840\u5e74\u4ea7\u80fd\u4f30\u7b97 ${estimatedY1Capacity} \u4ef6`
      : "\u7b49\u5f85\u4ea7\u7ebf\u53c2\u6570\u540e\u8ba1\u7b97\u8d2d\u7ebf\u6570\u91cf",
    productDevelopment
      ? `\u542f\u52a8 ${productDevelopment.product} \u56fe\u7eb8\u7814\u53d1\uff0c\u8d39\u7528 ${productDevelopment.cost} \u5143\uff0c\u5468\u671f ${productDevelopment.cycles} \u5b63`
      : targetY1Row
        ? `\u7f3a\u5c11 ${targetY1Row.product} \u7814\u53d1\u53c2\u6570\uff0c\u6682\u4e0d\u7f16\u9020\u7814\u53d1\u8d39\u7528`
        : "\u7b49\u5f85 Y1 \u4e3b\u653b\u4ea7\u54c1\u540e\u786e\u5b9a\u7814\u53d1",
    recommendedLoan && loanCapacity !== null
      ? `\u878d\u8d44\u4f18\u5148\u4f7f\u7528${recommendedLoan.name}\uff0c\u89c4\u5219\u989d\u5ea6\u4e0a\u9650\u7ea6 ${loanCapacity} \u5143\uff0c\u5229\u7387 ${recommendedLoan.rate}%`
      : "\u7b49\u5f85\u8d37\u6b3e\u53c2\u6570\u540e\u5b89\u6392\u878d\u8d44",
    targetY1Row
      ? `Y1 \u4e3b\u653b ${targetY1Row.product}\uff0c\u7ec4\u5747\u9700\u6c42 ${targetY1Demand ?? "\u5f85\u786e\u8ba4"} \u4ef6\uff0c\u5355\u4f4d\u6bdb\u5229 ${targetY1Row.unitMargin ?? "\u5f85\u786e\u8ba4"} \u5143`
      : "\u7b49\u5f85\u5e02\u573a\u8ba2\u5355\u540e\u786e\u5b9a Y1 \u4e3b\u653b\u4ea7\u54c1"
  ];

  const riskChecks = [
    cashBuffer !== null
      ? `\u5f00\u5c40\u6295\u8d44\u540e\u73b0\u91d1\u7f13\u51b2\u7ea6 ${cashBuffer} \u5143\uff0c\u82e5\u4e3a\u8d1f\u6570\u9700\u51cf\u5c11\u4ea7\u7ebf\u6216\u542f\u7528\u878d\u8d44`
      : "\u73b0\u91d1\u7f13\u51b2\u5f85\u521d\u59cb\u8d44\u672c\u548c\u6295\u8d44\u989d\u9f50\u5168\u540e\u8ba1\u7b97",
    recommendedLine
      ? `${recommendedLine.name}\u5b89\u88c5\u5468\u671f ${recommendedLine.installCycle} \u5b63\u3001\u751f\u4ea7\u5468\u671f ${recommendedLine.productionCycle} \u5b63\uff0c\u9700\u6838\u5bf9\u80fd\u5426\u8d76\u4e0a Y1 \u4ea4\u4ed8\u671f`
      : "\u4ea7\u7ebf\u8282\u594f\u5f85\u89c4\u5219\u53c2\u6570\u9f50\u5168\u540e\u68c0\u67e5",
    buildTransferPolicyCheck(recommendedLine),
    estimatedY1Capacity !== null && targetY1Demand !== null
      ? `\u4f30\u7b97\u4ea7\u80fd ${estimatedY1Capacity} \u4ef6\uff0c\u5bf9\u6bd4\u7ec4\u5747\u9700\u6c42 ${targetY1Demand} \u4ef6`
      : "\u4ea7\u80fd\u4e0e\u7ec4\u5747\u9700\u6c42\u5f85\u5e02\u573a\u548c\u7ec4\u6570\u9f50\u5168\u540e\u68c0\u67e5"
  ];
  const yearlyDecisions = buildYearlyDecisions(
    marketRows,
    recommendedLine,
    recommendedLineCount,
    maxLineLimit,
    developments
  );

  return {
    missingEvidence,
    initialCapital,
    recommendedLine,
    recommendedLineCount,
    estimatedY1Capacity,
    targetY1Row,
    targetY1Demand,
    plannedInvestment,
    cashBuffer,
    loanCapacity,
    recommendedLoan,
    productDevelopment,
    maxLineLimit,
    managementFee,
    openingActions,
    riskChecks,
    yearlyDecisions
  };
}
