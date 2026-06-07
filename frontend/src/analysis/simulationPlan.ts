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
  residualValue?: number;
  maintenanceFee?: number;
  depreciationYears?: number;
  juniorWorkerCount?: number;
  seniorWorkerCount?: number;
};

export type WorkerRule = {
  name: string;
  expectedSalary: number;
  pieceRate: number;
  quarterlyQuantity: number;
  efficiency: number;
};

export type IncentiveRule = {
  name: string;
  efficiencyLift: number;
};

export type LoanRule = {
  name: string;
  limitMultiplier: number;
  duration: number;
  repaymentMethod: string;
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
  recommendedLineName: string | null;
  recommendedNewLineCount: number | null;
  lineMix: Array<{ lineName: string; count: number; capacity: number }>;
  targetCapacity: number | null;
  capacityGap: number | null;
  lineComparison: string[];
  dismantleEvaluation: string | null;
  actions: string[];
  checks: string[];
};

export type EarlyStageFee = {
  quarter: string;
  label: string;
  amount: number;
};

export type QuarterlyCashBalance = {
  quarter: string;
  balance: number;
};

export type ProfitBreakdown = {
  revenue: number;
  materialCost: number;
  productionFee: number;
  directCost: number;
  grossProfit: number;
  managementFee: number;
  advertisingFee: number;
  maintenanceFee: number;
  developmentFee: number;
  transferFee: number;
  marketFee: number;
  isoFee: number;
  incentiveFee: number;
  comprehensiveFee: number;
  depreciation: number;
  financialExpense: number;
  profitBeforeTax: number;
  tax: number;
  netProfit: number;
};

export type LinePlanOption = {
  id: string;
  lineName: string;
  lineCount: number;
  capacityPerLine: number;
  capacityFormula: string;
  incentiveInsight: string | null;
  estimatedCapacity: number;
  targetProduct: string | null;
  targetOrderQuantity: number | null;
  targetRank: number | null;
  earlyFees: EarlyStageFee[];
  preDeliveryFeeTotal: number;
  adPointCash: number | null;
  adAvailableCashBeforeFinancing: number | null;
  plannedLoanDraw: number | null;
  reasonableAdAmount: number | null;
  requiredAdAmount: number | null;
  adFundingGap: number | null;
  adBudgetSource: string | null;
  grossMargin: number | null;
  profitBreakdown: ProfitBreakdown | null;
  profitFormula: string | null;
  netProfit: number | null;
  minPreDeliveryCash: number | null;
  cashTimeline: QuarterlyCashBalance[];
  cashPositiveUntilDelivery: boolean;
  notes: string[];
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
  linePlanOptions: LinePlanOption[];
};

type HeaderKind =
  | "line_purchase"
  | "line_maintenance"
  | "worker"
  | "incentive"
  | "loan"
  | "product_development"
  | "fee"
  | "basic_rule";

type BudgetReference = {
  advertisingFee: number | null;
  source: string | null;
};

const text = {
  initialCapital: "\u521d\u59cb\u8d44\u672c",
  lineName: "\u7ebf\u578b\u540d\u79f0",
  purchasePrice: "\u8d2d\u4e70\u4ef7\u683c",
  residualValue: "\u6b8b\u503c",
  juniorWorker: "\u666e\u901a\u5de5",
  seniorWorker: "\u9ad8\u7ea7\u5de5",
  loanName: "\u8d37\u6b3e\u540d\u79f0",
  productName: "\u4ea7\u54c1\u540d\u79f0",
  developmentCost: "\u6d88\u8017\u91d1\u94b1",
  feeName: "\u8d39\u7528\u540d\u79f0",
  ruleName: "\u89c4\u5219\u540d\u79f0",
  workerExpectedSalary: "\u521d\u59cb\u671f\u671b\u5de5\u8d44",
  workerEfficiency: "\u6548\u7387",
  incentiveName: "\u6fc0\u52b1\u540d\u79f0",
  smartLine: "\u667a\u80fd\u7ebf",
  smart: "\u667a\u80fd",
  automatic: "\u81ea\u52a8",
  shortTerm: "\u77ed\u671f",
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
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
    lines.find((line) => isFastZeroTransferAutomaticLine(line)) ??
    lines.find((line) => line.name.includes(text.automatic)) ??
    lines.find((line) => line.name.includes(text.smartLine)) ??
    lines.find((line) => line.name.includes(text.smart)) ??
    lines[0] ??
    null
  );
}

function isFastZeroTransferAutomaticLine(line: ProductionLineRule) {
  return line.name.includes(text.automatic) && line.installCycle <= 1 && (line.transferCycle ?? 0) === 0;
}

function lineStrategyRank(lineName: string, transferCycle: number | null, installCycle: number) {
  if (lineName.includes(text.automatic) && installCycle <= 1 && (transferCycle ?? 0) === 0) {
    return 40;
  }
  if (lineName.includes(text.automatic)) {
    return 30;
  }
  if (lineName.includes(text.smart)) {
    return 20;
  }
  return 10;
}

function chooseLoan(loans: LoanRule[]) {
  return (
    loans.find((loan) => loan.name.includes(text.shortTerm)) ??
    [...loans]
      .filter((loan) => !loan.name.includes(text.longTerm) && loan.duration <= 4)
      .sort((left, right) => right.duration - left.duration || left.rate - right.rate)[0] ??
    [...loans].sort((left, right) => left.rate - right.rate)[0] ??
    null
  );
}

function candidateLineCounts(maxLineLimit: number | null) {
  const limit = Math.max(1, Math.min(maxLineLimit ?? 16, 16));
  return Array.from({ length: limit }, (_, index) => index + 1);
}

function normalizeEfficiency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return value > 1 ? value / 100 : value;
}

function findWorker(workers: WorkerRule[], kind: "junior" | "senior") {
  const exactNeedle = kind === "junior" ? "\u521d\u7ea7" : "\u9ad8\u7ea7";
  const fallbackNeedle = kind === "junior" ? "\u666e\u901a" : "\u9ad8\u7ea7";
  return (
    workers.find((worker) => worker.name.includes(exactNeedle)) ??
    workers.find((worker) => worker.name.includes(fallbackNeedle)) ??
    null
  );
}

function findBonusIncentive(incentives: IncentiveRule[]) {
  return incentives.find((incentive) => incentive.name.includes("\u5956\u91d1")) ?? incentives[0] ?? null;
}

function calculateCapacityProfile(
  line: ProductionLineRule,
  workers: WorkerRule[],
  incentives: IncentiveRule[],
  unitMargin: number | null
) {
  const juniorWorker = findWorker(workers, "junior");
  const seniorWorker = findWorker(workers, "senior");
  const juniorEfficiency = normalizeEfficiency(juniorWorker?.efficiency);
  const seniorEfficiency = normalizeEfficiency(seniorWorker?.efficiency);
  const juniorCount = line.juniorWorkerCount ?? 0;
  const seniorCount = line.seniorWorkerCount ?? 0;

  if (juniorEfficiency === null || seniorEfficiency === null || juniorCount + seniorCount === 0) {
    return {
      capacityPerLine: line.capacity,
      seniorIncentiveCostPerLine: 0,
      formula: `\u57fa\u7840\u4ea7\u91cf ${line.capacity}\uff1b\u7f3a\u5c11\u5de5\u4eba\u914d\u6bd4\u6216\u6548\u7387\uff0c\u6682\u6309\u57fa\u7840\u4ea7\u91cf`,
      incentiveInsight: null
    };
  }

  const juniorEfficiencySum = juniorCount * juniorEfficiency;
  const seniorEfficiencySum = seniorCount * seniorEfficiency;
  const baseCapacityPerLine = Math.floor(line.capacity * (1 + juniorEfficiencySum / 4 + seniorEfficiencySum));
  const bonusIncentive = findBonusIncentive(incentives);
  const bonusLift = normalizeEfficiency(bonusIncentive?.efficiencyLift);
  const seniorFullCapacityPerLine = Math.floor(line.capacity * (1 + juniorEfficiencySum / 4 + seniorCount));
  const seniorIncentiveCostPerLine =
    bonusLift !== null && bonusLift > 0 && seniorEfficiency < 1 && seniorCount > 0
      ? roundMoney(((1 - seniorEfficiency) / bonusLift) * 10000 * seniorCount)
      : 0;
  const seniorFullGrossGain =
    unitMargin !== null ? roundMoney((seniorFullCapacityPerLine - baseCapacityPerLine) * unitMargin) : null;
  const shouldLiftSeniorToFull =
    unitMargin !== null &&
    seniorIncentiveCostPerLine > 0 &&
    seniorFullCapacityPerLine > baseCapacityPerLine &&
    seniorFullGrossGain !== null &&
    seniorFullGrossGain > seniorIncentiveCostPerLine;
  const capacityPerLine = shouldLiftSeniorToFull ? seniorFullCapacityPerLine : baseCapacityPerLine;
  const juniorCapacityPerOnePercent = line.capacity * juniorCount * 0.01 / 4;
  const seniorCapacityPerOnePercent = line.capacity * seniorCount * 0.01;
  const juniorGrossGain =
    unitMargin !== null ? roundMoney(juniorCapacityPerOnePercent * unitMargin) : null;
  const seniorGrossGain =
    unitMargin !== null ? roundMoney(seniorCapacityPerOnePercent * unitMargin) : null;

  const incentiveNames = incentives.length > 0 ? incentives.map((item) => item.name).join("/") : "\u5f85\u786e\u8ba4";

  return {
    capacityPerLine,
    seniorIncentiveCostPerLine: shouldLiftSeniorToFull ? seniorIncentiveCostPerLine : 0,
    formula:
      shouldLiftSeniorToFull
        ? `${line.capacity} × (1 + ${juniorCount}×${Math.round(juniorEfficiency * 100)}%/4 + ` +
          `${seniorCount}×100%) = ${capacityPerLine}\uff08\u9ad8\u7ea7\u5de5\u6fc0\u52b1\u5230100%\uff0c\u6fc0\u52b1\u8d39 ${seniorIncentiveCostPerLine}/\u7ebf\uff09`
        : `${line.capacity} × (1 + ${juniorCount}×${Math.round(juniorEfficiency * 100)}%/4 + ` +
          `${seniorCount}×${Math.round(seniorEfficiency * 100)}%) = ${capacityPerLine}`,
    incentiveInsight:
      unitMargin !== null
        ? `\u6fc0\u52b1\u8fb9\u9645\uff1a\u521d\u7ea7\u5de5\u6bcf\u63d0\u53471%\u5355\u7ebf\u589e\u4ea7 ${roundMoney(
            juniorCapacityPerOnePercent
          )} \u4ef6\uff0c\u6bdb\u5229\u7ea6 ${juniorGrossGain} \u5143\uff1b\u9ad8\u7ea7\u5de5\u6bcf\u63d0\u53471%\u5355\u7ebf\u589e\u4ea7 ${roundMoney(
            seniorCapacityPerOnePercent
          )} \u4ef6\uff0c\u6bdb\u5229\u7ea6 ${seniorGrossGain} \u5143\u3002\u53ef\u7528\u6fc0\u52b1\uff1a${incentiveNames}\u3002\u9ad8\u5229\u6da6\u4ea7\u54c1\u672a\u51fa\u73b0\u65f6\uff0c\u521d\u7ea7\u5de5\u56e0\u4e3a\u8981\u9664\u4ee54\uff0c\u5fc5\u987b\u5148\u7528\u589e\u4ea7\u6bdb\u5229\u8986\u76d6\u6fc0\u52b1\u6210\u672c\u624d\u505a`
        : null
  };
}

function buildEarlyFees(
  line: ProductionLineRule,
  lineCount: number,
  managementFee: number | null,
  productDevelopment: ProductDevelopmentRule | null,
  loan: LoanRule | null,
  loanCapacity: number | null,
  seniorIncentiveCost: number,
  productionCashCosts: {
    materialCost: number;
    productionFee: number;
  }
) {
  const deliveryQuarter = Math.max(1, Math.min(4, Math.ceil(line.installCycle + line.productionCycle)));
  const productionStartQuarter = Math.max(1, Math.min(deliveryQuarter, Math.ceil(line.installCycle) + 1));
  const fees: EarlyStageFee[] = [
    {
      quarter: "Q1",
      label: "\u8d2d\u4e70\u4ea7\u7ebf",
      amount: line.purchasePrice * lineCount
    }
  ];

  if (productDevelopment) {
    fees.push({
      quarter: "Q1",
      label: "\u4ea7\u54c1\u7814\u53d1",
      amount: productDevelopment.cost
    });
  }

  if (seniorIncentiveCost > 0) {
    fees.push({
      quarter: `Q${productionStartQuarter}`,
      label: "\u9ad8\u7ea7\u5de5\u6fc0\u52b1\u5230100%",
      amount: seniorIncentiveCost
    });
  }

  if (productionCashCosts.materialCost > 0) {
    fees.push({
      quarter: `Q${productionStartQuarter}`,
      label: "\u6750\u6599\u91c7\u8d2d",
      amount: productionCashCosts.materialCost
    });
  }

  if (productionCashCosts.productionFee > 0) {
    fees.push({
      quarter: `Q${productionStartQuarter}`,
      label: "\u751f\u4ea7\u8d39",
      amount: productionCashCosts.productionFee
    });
  }

  if (managementFee !== null) {
    for (let quarter = 1; quarter <= deliveryQuarter; quarter += 1) {
      fees.push({
        quarter: `Q${quarter}`,
        label: `Q${quarter} \u7ba1\u7406\u8d39`,
        amount: managementFee
      });
    }
  }

  if (loan && loanCapacity !== null && loanCapacity > 0) {
    const quarterlyInterest = roundMoney(loanCapacity * (loan.rate / 100));
    if (loan.repaymentMethod.includes("\u6bcf\u5b63\u4ed8\u606f")) {
      for (let quarter = 1; quarter <= deliveryQuarter; quarter += 1) {
        fees.push({
          quarter: `Q${quarter}`,
          label: `Q${quarter} \u878d\u8d44\u5229\u606f`,
          amount: quarterlyInterest
        });
      }
    } else if (loan.duration <= deliveryQuarter) {
      fees.push({
        quarter: `Q${loan.duration}`,
        label: `Q${loan.duration} \u878d\u8d44\u8fd8\u672c\u4ed8\u606f`,
        amount: roundMoney(loanCapacity + loanCapacity * (loan.rate / 100))
      });
    }
  }

  return fees;
}

function sumFees(fees: EarlyStageFee[], predicate: (fee: EarlyStageFee) => boolean) {
  return fees.filter(predicate).reduce((total, fee) => total + fee.amount, 0);
}

function buildCashTimeline(openingCash: number | null, fees: EarlyStageFee[], adAmount: number | null) {
  if (openingCash === null || adAmount === null) {
    return [];
  }

  let cash = openingCash;
  const maxQuarter = fees.reduce((max, fee) => {
    const quarter = Number.parseInt(fee.quarter.replace("Q", ""), 10);
    return Number.isFinite(quarter) ? Math.max(max, quarter) : max;
  }, 1);

  return Array.from({ length: maxQuarter }, (_, index) => {
    const quarter = `Q${index + 1}`;
    const quarterFees = sumFees(fees, (fee) => fee.quarter === quarter);
    cash = roundMoney(cash - quarterFees - (quarter === "Q1" ? adAmount : 0));
    return { quarter, balance: cash };
  });
}

function parseBudgetReference(fragments: DocumentUploadResponse["fragments"]): BudgetReference {
  let advertisingFee: number | null = null;
  let source: string | null = null;

  for (const fragment of fragments) {
    const cells = splitCells(fragment.text);
    if (!cells[0]?.includes("\u5e7f\u544a")) {
      continue;
    }

    const values = cells.slice(1).map(toNumber).filter((value): value is number => value !== null);
    if (values.length === 0) {
      continue;
    }

    advertisingFee = roundMoney(values.reduce((total, value) => total + value, 0));
    source = "\u5df2\u8bfb\u53d6\u9884\u7b97\u8868\u5e7f\u544a\u884c\uff1a\u5e7f\u544a\u662f\u5b63\u5ea6\u9884\u7b97\u8f93\u5165\uff0c\u76f4\u63a5\u8fdb\u5165\u73b0\u91d1\u6d41\u7b2c 37 \u884c\u548c\u7efc\u5408\u8d39\u7528";
  }

  return { advertisingFee, source };
}

function estimateCompetitiveAdvertising(
  targetOrderQuantity: number | null,
  targetRank: number | null,
  groupCount: number | null,
  unitMargin: number | null,
  budgetReference: BudgetReference,
  adCashLimit: number | null
) {
  if (budgetReference.advertisingFee !== null) {
    const adAmount =
      adCashLimit !== null ? roundMoney(Math.min(budgetReference.advertisingFee, Math.max(0, adCashLimit))) : budgetReference.advertisingFee;
    const capped =
      adCashLimit !== null && budgetReference.advertisingFee > adCashLimit
        ? "\uff1b\u4f46\u8d85\u8fc7\u5f53\u524d\u65b9\u6848\u73b0\u91d1\u4e0a\u9650\uff0c\u5df2\u6309\u53ef\u6295\u4e0a\u9650\u622a\u65ad"
        : "";
    return {
      requiredAdAmount: budgetReference.advertisingFee,
      adAmount,
      fundingGap: adCashLimit !== null ? roundMoney(Math.max(0, budgetReference.advertisingFee - adCashLimit)) : null,
      source: `${budgetReference.source}${capped}`
    };
  }

  if (targetOrderQuantity === null || targetRank === null || unitMargin === null) {
    return {
      requiredAdAmount: null,
      adAmount: null,
      fundingGap: null,
      source: "\u7f3a\u5c11\u8ba2\u5355\u91cf\u3001\u6392\u540d\u6216\u5355\u4f4d\u6bdb\u5229\uff0c\u4e0d\u7f16\u9020\u5e7f\u544a\u9884\u7b97"
    };
  }

  const rankPressure = groupCount !== null ? Math.max(0, groupCount - targetRank + 1) / Math.max(1, groupCount) : 0.5;
  const competitiveUnitAd = Math.max(100, Math.min(unitMargin * 0.18, 1200)) * (1 + rankPressure);
  const estimatedAd = roundMoney(targetOrderQuantity * competitiveUnitAd);
  const adAmount = adCashLimit !== null ? roundMoney(Math.min(estimatedAd, Math.max(0, adCashLimit))) : estimatedAd;
  const capped =
    adCashLimit !== null && estimatedAd > adCashLimit
      ? "\uff1b\u8d85\u8fc7\u73b0\u91d1\u53ef\u6295\u4e0a\u9650\uff0c\u5df2\u6309\u4e0a\u9650\u622a\u65ad"
      : "";

  return {
    requiredAdAmount: estimatedAd,
    adAmount,
    fundingGap: adCashLimit !== null ? roundMoney(Math.max(0, estimatedAd - adCashLimit)) : null,
    source:
      `\u672a\u8bfb\u5230\u5bf9\u624b\u5e7f\u544a\u8868\uff0c\u5148\u6309\u7ade\u4e89\u9884\u7b97\u4f30\u7b97\uff1a\u76ee\u6807\u524d ${targetRank} \u540d\u3001` +
      `\u8ba2\u5355 ${targetOrderQuantity} \u4ef6\u3001\u5355\u4f4d\u6bdb\u5229 ${unitMargin} \u5143\uff1b\u6700\u7ec8\u5fc5\u987b\u7528\u9009\u5355\u5f97\u5206/\u5bf9\u624b\u5e7f\u544a\u6821\u51c6${capped}`
  };
}

function minTimelineBalance(timeline: QuarterlyCashBalance[]) {
  return timeline.length > 0 ? Math.min(...timeline.map((item) => item.balance)) : null;
}

function calculateProductionFeePerUnit(line: ProductionLineRule, workers: WorkerRule[]) {
  const juniorWorker = findWorker(workers, "junior");
  const seniorWorker = findWorker(workers, "senior");
  const juniorPieceRate = juniorWorker?.pieceRate ?? 0;
  const seniorPieceRate = seniorWorker?.pieceRate ?? 0;

  return roundMoney(
    (line.juniorWorkerCount ?? 0) * juniorPieceRate + (line.seniorWorkerCount ?? 0) * seniorPieceRate
  );
}

function calculateDepreciation(line: ProductionLineRule, lineCount: number) {
  if (!line.depreciationYears || line.depreciationYears <= 0) {
    return 0;
  }

  return roundMoney(((line.purchasePrice - (line.residualValue ?? 0)) / line.depreciationYears) * lineCount);
}

function buildProfitBreakdown(
  line: ProductionLineRule,
  lineCount: number,
  workers: WorkerRule[],
  targetY1Row: MarketAnalysisRow | null,
  targetOrderQuantity: number | null,
  reasonableAdAmount: number | null,
  earlyFees: EarlyStageFee[],
  productDevelopment: ProductDevelopmentRule | null
) {
  if (
    targetY1Row === null ||
    targetOrderQuantity === null ||
    targetY1Row.price === null ||
    targetY1Row.cost === null ||
    reasonableAdAmount === null
  ) {
    return {
      breakdown: null,
      formula: null
    };
  }

  const revenue = roundMoney(targetOrderQuantity * targetY1Row.price);
  const materialCost = roundMoney(targetOrderQuantity * targetY1Row.cost);
  const productionFee = roundMoney(targetOrderQuantity * calculateProductionFeePerUnit(line, workers));
  const directCost = roundMoney(materialCost + productionFee);
  const grossProfit = roundMoney(revenue - directCost);
  const managementFee = sumFees(earlyFees, (fee) => fee.label.includes("\u7ba1\u7406\u8d39"));
  const financialExpense = sumFees(earlyFees, (fee) => fee.label.includes("\u878d\u8d44"));
  const incentiveFee = sumFees(earlyFees, (fee) => fee.label.includes("\u6fc0\u52b1"));
  const maintenanceFee = 0;
  const developmentFee = productDevelopment?.cost ?? 0;
  const transferFee = sumFees(earlyFees, (fee) => fee.label.includes("\u8f6c\u4ea7"));
  const marketFee = 0;
  const isoFee = 0;
  const comprehensiveFee = roundMoney(
    managementFee +
      reasonableAdAmount +
      maintenanceFee +
      transferFee +
      marketFee +
      isoFee +
      developmentFee +
      incentiveFee
  );
  const depreciation = calculateDepreciation(line, lineCount);
  const profitBeforeTax = roundMoney(grossProfit - comprehensiveFee - depreciation - financialExpense);
  const tax = profitBeforeTax > 0 ? Math.round(profitBeforeTax / 4) : 0;
  const netProfit = roundMoney(profitBeforeTax - tax);
  const formula =
    `利润表口径：收入 ${revenue} - 直接成本 ${directCost} = 毛利 ${grossProfit}；` +
    `综合费用 ${comprehensiveFee}（管理 ${managementFee}、广告 ${reasonableAdAmount}、维护 ${maintenanceFee}、转产 ${transferFee}、市场 ${marketFee}、ISO ${isoFee}、研发 ${developmentFee}、激励 ${incentiveFee}）；` +
    `再扣折旧 ${depreciation}、财务费用 ${financialExpense}、所得税 ${tax} = 净利润 ${netProfit}`;

  return {
    breakdown: {
      revenue,
      materialCost,
      productionFee,
      directCost,
      grossProfit,
      managementFee,
      advertisingFee: reasonableAdAmount,
      maintenanceFee,
      developmentFee,
      transferFee,
      marketFee,
      isoFee,
      incentiveFee,
      comprehensiveFee,
      depreciation,
      financialExpense,
      profitBeforeTax,
      tax,
      netProfit
    },
    formula
  };
}

function buildLinePlanOptions(
  lines: ProductionLineRule[],
  workers: WorkerRule[],
  incentives: IncentiveRule[],
  initialCapital: number | null,
  loanCapacity: number | null,
  recommendedLoan: LoanRule | null,
  targetY1Row: MarketAnalysisRow | null,
  targetY1Demand: number | null,
  groupCount: number | null,
  maxLineLimit: number | null,
  managementFee: number | null,
  productDevelopment: ProductDevelopmentRule | null,
  budgetReference: BudgetReference
): LinePlanOption[] {
  if (lines.length === 0) {
    return [];
  }

  return lines
    .flatMap((line) =>
      candidateLineCounts(maxLineLimit).map<LinePlanOption>((lineCount) => {
        const unitMargin = targetY1Row?.unitMargin ?? null;
        const capacityProfile = calculateCapacityProfile(line, workers, incentives, unitMargin);
        const estimatedCapacity = capacityProfile.capacityPerLine * lineCount;
        const targetOrderCeiling = targetY1Row?.capacity ?? null;
        const targetOrderQuantity =
          targetOrderCeiling !== null ? Math.min(estimatedCapacity, targetOrderCeiling) : null;
        const rankByCapacity =
          targetY1Demand !== null && targetOrderQuantity !== null
            ? Math.max(1, Math.ceil(targetOrderQuantity / targetY1Demand))
            : null;
        const targetRank =
          rankByCapacity !== null && groupCount !== null ? Math.min(groupCount, rankByCapacity) : rankByCapacity;
        const productionCashCosts = {
          materialCost:
            targetOrderQuantity !== null && targetY1Row?.cost !== null && targetY1Row?.cost !== undefined
              ? roundMoney(targetOrderQuantity * targetY1Row.cost)
              : 0,
          productionFee:
            targetOrderQuantity !== null
              ? roundMoney(targetOrderQuantity * calculateProductionFeePerUnit(line, workers))
              : 0
        };
        const earlyFees = buildEarlyFees(
          line,
          lineCount,
          managementFee,
          productDevelopment,
          recommendedLoan,
          loanCapacity,
          capacityProfile.seniorIncentiveCostPerLine * lineCount,
          productionCashCosts
        );
        const preAdExpense = sumFees(earlyFees, (fee) => fee.quarter === "Q1");
        const preDeliveryFeeTotal = sumFees(earlyFees, () => true);
        const reserveAfterAd = preDeliveryFeeTotal - preAdExpense;
        const openingCash =
          initialCapital !== null ? initialCapital + (loanCapacity ?? 0) : null;
        const adAvailableCashBeforeFinancing =
          initialCapital !== null ? roundMoney(initialCapital - preDeliveryFeeTotal) : null;
        const plannedLoanDraw = loanCapacity ?? null;
        const adPointCash = openingCash !== null ? roundMoney(Math.max(0, openingCash - preDeliveryFeeTotal)) : null;
        const grossMargin =
          targetOrderQuantity !== null && unitMargin !== null
            ? roundMoney(targetOrderQuantity * unitMargin)
            : null;
        const advertising = estimateCompetitiveAdvertising(
          targetOrderQuantity,
          targetRank,
          groupCount,
          unitMargin,
          budgetReference,
          adPointCash
        );
        const reasonableAdAmount = advertising.adAmount;
        const profit = buildProfitBreakdown(
          line,
          lineCount,
          workers,
          targetY1Row,
          targetOrderQuantity,
          reasonableAdAmount,
          earlyFees,
          productDevelopment
        );
        const netProfit = profit.breakdown?.netProfit ?? null;
        const cashTimeline = buildCashTimeline(openingCash, earlyFees, reasonableAdAmount);
        const minPreDeliveryCash = minTimelineBalance(cashTimeline);
        const cashPositiveUntilDelivery =
          minPreDeliveryCash !== null && cashTimeline.every((quarter) => quarter.balance > 0);

        const notes = [
          targetRank !== null
            ? `\u7ade\u4e89\u6027\u62a2\u5355\uff1a\u76ee\u6807\u4e0d\u662f\u53ea\u5403\u7ec4\u5747\uff0c\u800c\u662f\u7528\u4ea7\u80fd ${targetOrderQuantity ?? "\u5f85\u786e\u8ba4"} \u4ef6\u53bb\u62a2\u5e02\u573a\u603b\u5bb9\u91cf\uff0c\u9700\u5bf9\u6807\u5e7f\u544a\u524d ${targetRank} \u540d\u6216\u540c\u7ea7\u987a\u4f4d`
            : "\u7f3a\u5c11\u5e02\u573a\u603b\u5bb9\u91cf\u3001\u7ec4\u6570\u6216\u7ec4\u5747\u9700\u6c42\uff0c\u65e0\u6cd5\u7ed9\u51fa\u7ade\u4e89\u6027\u5e7f\u544a\u6392\u540d\u76ee\u6807",
          advertising.source,
          adPointCash !== null
            ? `\u5e7f\u544a\u73b0\u91d1 ${adPointCash} \u5143\uff1a\u5df2\u6263\u9664\u8d2d\u7ebf\u3001\u7814\u53d1\u3001\u6fc0\u52b1\u3001\u6750\u6599\u3001\u751f\u4ea7\u8d39\u3001\u7ba1\u7406\u8d39\u7b49\u5fc5\u8981\u8d39\u7528 ${preDeliveryFeeTotal} \u5143`
            : "\u5e7f\u544a\u73b0\u91d1\u5f85\u73b0\u91d1\u6d41\u8bc1\u636e\u9f50\u5168\u540e\u8ba1\u7b97",
          advertising.fundingGap !== null && advertising.fundingGap > 0
            ? `\u51b2\u91cf\u65b9\u6848\u5e7f\u544a\u8d44\u91d1\u7f3a\u53e3 ${advertising.fundingGap} \u5143\uff1a\u8be5\u65b9\u6848\u53ef\u4ee5\u5217\u51fa\uff0c\u4f46\u9700\u8c03\u6574\u878d\u8d44\u3001\u964d\u5e7f\u544a\u76ee\u6807\u6216\u51cf\u5c11\u5f53\u671f\u5fc5\u8981\u652f\u51fa\u540e\u624d\u80fd\u8dd1\u901a`
            : "\u5e7f\u544a\u8d44\u91d1\u7f3a\u53e3 0 \u5143",
          minPreDeliveryCash !== null
            ? `\u4ea4\u8d27\u524d\u9010\u5b63\u6700\u4f4e\u73b0\u91d1 ${minPreDeliveryCash} \u5143`
            : "\u4ea4\u8d27\u524d\u73b0\u91d1\u9700\u8d37\u6b3e\u548c\u8d39\u7528\u8bc1\u636e\u9f50\u5168\u540e\u6821\u9a8c",
          (line.maintenanceFee ?? 0) > 0
            ? `\u4ea7\u7ebf\u7ef4\u62a4\u8d39 ${roundMoney((line.maintenanceFee ?? 0) * lineCount)} \u5143\u6309\u5efa\u6210\u540e\u4e0b\u4e00\u5e74\u7f34\u7eb3\uff0c\u4e0d\u8ba1\u5165 Y1 \u5f53\u5b63\u6216\u4ea4\u8d27\u524d\u73b0\u91d1\u652f\u51fa`
            : "\u672a\u8bfb\u5230\u4ea7\u7ebf\u7ef4\u62a4\u8d39\uff0c\u7ef4\u62a4\u8d39\u8282\u70b9\u5f85\u89c4\u5219\u8868\u786e\u8ba4",
          profit.formula ?? "\u7f3a\u5c11\u552e\u4ef7\u3001\u6750\u6599\u6210\u672c\u6216\u5e7f\u544a\u989d\uff0c\u51c0\u5229\u6da6\u4e0d\u7f16\u9020",
          `\u4ea7\u80fd\u516c\u5f0f\uff1a${capacityProfile.formula}`,
          ...(capacityProfile.incentiveInsight ? [capacityProfile.incentiveInsight] : []),
          buildTransferPolicyCheck(line)
        ];

        return {
          id: `${line.name}-${lineCount}`,
          lineName: line.name,
          lineCount,
          capacityPerLine: capacityProfile.capacityPerLine,
          capacityFormula: capacityProfile.formula,
          incentiveInsight: capacityProfile.incentiveInsight,
          estimatedCapacity,
          targetProduct: targetY1Row?.product ?? null,
          targetOrderQuantity,
          targetRank,
          earlyFees,
          preDeliveryFeeTotal,
          adPointCash,
          adAvailableCashBeforeFinancing,
          plannedLoanDraw,
          reasonableAdAmount,
          requiredAdAmount: advertising.requiredAdAmount,
          adFundingGap: advertising.fundingGap,
          adBudgetSource: advertising.source,
          grossMargin,
          profitBreakdown: profit.breakdown,
          profitFormula: profit.formula,
          netProfit,
          minPreDeliveryCash,
          cashTimeline,
          cashPositiveUntilDelivery,
          notes
        };
      })
    )
    .sort((left, right) => {
      const leftLine = lines.find((line) => line.name === left.lineName);
      const rightLine = lines.find((line) => line.name === right.lineName);
      const leftRank = leftLine ? lineStrategyRank(leftLine.name, leftLine.transferCycle, leftLine.installCycle) : 0;
      const rightRank = rightLine ? lineStrategyRank(rightLine.name, rightLine.transferCycle, rightLine.installCycle) : 0;
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }
      if (left.lineName === right.lineName && left.lineCount !== right.lineCount) {
        return right.lineCount - left.lineCount;
      }
      if (left.cashPositiveUntilDelivery !== right.cashPositiveUntilDelivery) {
        return left.cashPositiveUntilDelivery ? -1 : 1;
      }
      const profitDifference = (right.netProfit ?? -Infinity) - (left.netProfit ?? -Infinity);
      if (profitDifference !== 0) {
        return profitDifference;
      }
      return left.preDeliveryFeeTotal - right.preDeliveryFeeTotal;
    });
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
  lines: ProductionLineRule[],
  workers: WorkerRule[],
  incentives: IncentiveRule[],
  startingLine: ProductionLineRule | null,
  startingLineCount: number | null,
  maxLineLimit: number | null,
  developments: ProductDevelopmentRule[]
): YearlyOperationDecision[] {
  const lineMix = new Map<string, number>();
  if (startingLine && startingLineCount !== null && startingLineCount > 0) {
    lineMix.set(startingLine.name, startingLineCount);
  }

  const lineLimit = maxLineLimit ?? 16;

  function totalLines() {
    return Array.from(lineMix.values()).reduce((total, count) => total + count, 0);
  }

  function lineCapacity(line: ProductionLineRule, unitMargin: number | null) {
    return calculateCapacityProfile(line, workers, incentives, unitMargin).capacityPerLine;
  }

  function chooseExpansionLine(targetMarket: MarketAnalysisRow | null) {
    if (lines.length === 0) {
      return null;
    }

    const unitMargin = targetMarket?.unitMargin ?? null;
    const automaticLine = lines.find((line) => line.name.includes(text.automatic)) ?? null;
    const smartLine =
      lines.find((line) => line.name.includes(text.smartLine)) ??
      lines.find((line) => line.name.includes(text.smart)) ??
      null;

    if (!automaticLine || !smartLine) {
      return [...lines].sort((left, right) => {
        const leftCapacity = lineCapacity(left, unitMargin);
        const rightCapacity = lineCapacity(right, unitMargin);
        return rightCapacity - leftCapacity || left.installCycle - right.installCycle;
      })[0] ?? null;
    }

    const automaticCapacity = lineCapacity(automaticLine, unitMargin);
    const smartCapacity = lineCapacity(smartLine, unitMargin);
    const capacityGapRate =
      automaticCapacity > 0 ? (smartCapacity - automaticCapacity) / automaticCapacity : 0;
    const automaticIsFaster = automaticLine.installCycle < smartLine.installCycle;
    const automaticTransferSlow = (automaticLine.transferCycle ?? 0) > 0;
    const highMargin = (targetMarket?.unitMargin ?? 0) >= 5000;

    if (capacityGapRate >= 0.25 && highMargin) {
      return smartLine;
    }
    if (automaticTransferSlow && targetMarket?.product && targetMarket.product !== "P1") {
      return smartLine;
    }
    if (automaticIsFaster && capacityGapRate < 0.25) {
      return automaticLine;
    }
    return smartCapacity >= automaticCapacity ? smartLine : automaticLine;
  }

  function buildLineMixSummary(targetMarket: MarketAnalysisRow | null) {
    return Array.from(lineMix.entries()).map(([lineName, count]) => {
      const line = lines.find((item) => item.name === lineName);
      const capacity = line ? lineCapacity(line, targetMarket?.unitMargin ?? null) * count : 0;
      return { lineName, count, capacity };
    });
  }

  function currentCapacity(targetMarket: MarketAnalysisRow | null) {
    return buildLineMixSummary(targetMarket).reduce((total, item) => total + item.capacity, 0);
  }

  function compareLines(targetMarket: MarketAnalysisRow | null) {
    const unitMargin = targetMarket?.unitMargin ?? null;
    const automaticLine = lines.find((line) => line.name.includes(text.automatic)) ?? null;
    const smartLine =
      lines.find((line) => line.name.includes(text.smartLine)) ??
      lines.find((line) => line.name.includes(text.smart)) ??
      null;

    if (!automaticLine || !smartLine) {
      return lines.map((line) => {
        const capacity = lineCapacity(line, unitMargin);
        return `${line.name}：单线产能 ${capacity}，安装 ${line.installCycle} 季，转产 ${line.transferCycle ?? "待确认"} 季`;
      });
    }

    const automaticCapacity = lineCapacity(automaticLine, unitMargin);
    const smartCapacity = lineCapacity(smartLine, unitMargin);
    const difference = smartCapacity - automaticCapacity;
    const differenceRate = automaticCapacity > 0 ? Math.round((difference / automaticCapacity) * 100) : 0;
    const automaticSeasonalGross =
      unitMargin !== null ? roundMoney(automaticCapacity * unitMargin) : null;
    const smartSeasonalGross = unitMargin !== null ? roundMoney(smartCapacity * unitMargin) : null;

    return [
      `自动线：单线产能 ${automaticCapacity}，安装 ${automaticLine.installCycle} 季，转产 ${automaticLine.transferCycle ?? "待确认"} 季，单季毛利 ${automaticSeasonalGross ?? "待确认"} 元`,
      `智能线：单线产能 ${smartCapacity}，安装 ${smartLine.installCycle} 季，转产 ${smartLine.transferCycle ?? "待确认"} 季，单季毛利 ${smartSeasonalGross ?? "待确认"} 元`,
      `产能差：智能线比自动线 ${difference >= 0 ? "多" : "少"} ${Math.abs(difference)} 件，差距约 ${differenceRate}%；差距小且自动线更快时优先补自动，差距大或高利润产品期优先补智能`
    ];
  }

  function evaluateDismantle(
    yearIndex: number,
    targetMarket: MarketAnalysisRow | null,
    recommendedLine: ProductionLineRule | null
  ) {
    const unitMargin = targetMarket?.unitMargin;
    if (!recommendedLine || unitMargin === null || unitMargin === undefined) {
      return null;
    }
    if (totalLines() < lineLimit) {
      return "未满线，优先新增产线，不做拆线";
    }

    const remainingSeasons = Math.max(1, (4 - yearIndex + 1) * 4);
    const newCapacity = lineCapacity(recommendedLine, unitMargin);
    const newSeasonalGross = newCapacity * unitMargin;
    const candidates = Array.from(lineMix.entries())
      .map(([lineName, count]) => {
        const oldLine = lines.find((line) => line.name === lineName);
        if (!oldLine || oldLine.name === recommendedLine.name || count <= 0) {
          return null;
        }
        const oldCapacity = lineCapacity(oldLine, unitMargin);
        const oldSeasonalGross = oldCapacity * unitMargin;
        const downtimeLoss = oldSeasonalGross * Math.max(0, recommendedLine.installCycle);
        const replacementCost = recommendedLine.purchasePrice - (oldLine.residualValue ?? 0);
        const netGain = roundMoney(
          (newSeasonalGross - oldSeasonalGross) * remainingSeasons - downtimeLoss - replacementCost
        );
        return { oldLine, oldCapacity, netGain };
      })
      .filter((item): item is { oldLine: ProductionLineRule; oldCapacity: number; netGain: number } => item !== null)
      .sort((left, right) => right.netGain - left.netGain);

    const best = candidates[0];
    if (!best) {
      return "已满线但当前推荐线型与存量一致，不拆线";
    }
    if (best.netGain > 0) {
      lineMix.set(best.oldLine.name, Math.max(0, (lineMix.get(best.oldLine.name) ?? 0) - 1));
      lineMix.set(recommendedLine.name, (lineMix.get(recommendedLine.name) ?? 0) + 1);
      return `满线拆线可行：拆 1 条${best.oldLine.name}换${recommendedLine.name}，按剩余 ${remainingSeasons} 季估算净增益 ${best.netGain} 元，仍需进入季度现金流复核`;
    }
    return `满线不拆：替换收益 ${best.netGain} 元，不覆盖停产损失和购线差额`;
  }

  return ["Y1", "Y2", "Y3", "Y4"].map((year, index) => {
    const targetMarket = bestRowForYear(marketRows, year);
    const targetDemand = targetMarket?.groupAverageCapacity ?? null;
    const recommendedLine = chooseExpansionLine(targetMarket);
    const beforeCapacity = currentCapacity(targetMarket);
    const recommendedCapacity = recommendedLine ? lineCapacity(recommendedLine, targetMarket?.unitMargin ?? null) : 0;
    const capacityShortfall =
      targetDemand !== null ? Math.max(0, targetDemand - beforeCapacity) : 0;
    const availableSlots = Math.max(0, lineLimit - totalLines());
    const recommendedNewLineCount =
      recommendedLine && recommendedCapacity > 0 && targetDemand !== null
        ? Math.min(availableSlots, Math.ceil(capacityShortfall / recommendedCapacity))
        : 0;

    if (recommendedLine && recommendedNewLineCount > 0) {
      lineMix.set(recommendedLine.name, (lineMix.get(recommendedLine.name) ?? 0) + recommendedNewLineCount);
    }

    const dismantleEvaluation = evaluateDismantle(index + 1, targetMarket, recommendedLine);
    const lineMixSummary = buildLineMixSummary(targetMarket);
    const targetCapacity = lineMixSummary.reduce((total, item) => total + item.capacity, 0);
    const capacityGap =
      targetDemand !== null && targetCapacity !== null ? targetCapacity - targetDemand : null;
    const development = targetMarket
      ? developments.find((item) => item.product === targetMarket.product) ?? null
      : null;
    const lineComparison = compareLines(targetMarket);

    const actions = [
      targetMarket
        ? `${year} \u4e3b\u653b ${targetMarket.product}\uff0c\u7ec4\u5747\u9700\u6c42 ${targetDemand ?? "\u5f85\u786e\u8ba4"} \u4ef6\uff0c\u5355\u4f4d\u6bdb\u5229 ${targetMarket.unitMargin ?? "\u5f85\u786e\u8ba4"} \u5143`
        : `${year} \u7f3a\u5c11\u5e02\u573a\u8ba2\u5355\uff0c\u4e0d\u751f\u6210\u4e3b\u653b\u65b9\u5411`,
      recommendedLine
        ? `\u63a8\u8350\u8865 ${recommendedLine.name}\uff1a\u672c\u5e74\u65b0\u589e ${recommendedNewLineCount} \u6761\uff0c\u7ebf\u578b\u7ec4\u5408 ${lineMixSummary
            .map((item) => `${item.lineName}×${item.count}`)
            .join("\u3001") || "\u5f85\u786e\u8ba4"}`
        : "\u7b49\u5f85\u4ea7\u7ebf\u53c2\u6570\u540e\u8ba1\u7b97\u8865\u7ebf\u65b9\u5411",
      development
        ? `${targetMarket?.product} \u7814\u53d1\u8d39 ${development.cost} \u5143\uff0c\u5468\u671f ${development.cycles} \u5b63\uff0c\u9700\u5361\u5728\u5e02\u573a\u7206\u53d1\u524d\u5b8c\u6210`
        : targetMarket
          ? `${targetMarket.product} \u7814\u53d1\u53c2\u6570\u672a\u9f50\uff0c\u6682\u4e0d\u7f16\u9020\u7814\u53d1\u8282\u594f`
          : "\u5f85\u5e02\u573a\u4e3b\u653b\u4ea7\u54c1\u786e\u8ba4\u540e\u5b89\u6392\u7814\u53d1"
    ].filter((action): action is string => action !== null);

    const checks = [
      capacityGap !== null
        ? `\u4ea7\u80fd\u5dee\u989d ${capacityGap} \u4ef6\uff1b\u8d1f\u6570\u8868\u793a\u4ea7\u80fd\u4e0d\u8db3\uff0c\u9700\u8c03\u6574\u8d2d\u7ebf\u6216\u5e7f\u544a\u62a2\u5355`
        : "\u4ea7\u80fd\u5dee\u989d\u5f85\u5e02\u573a\u3001\u7ec4\u6570\u548c\u4ea7\u7ebf\u53c2\u6570\u9f50\u5168\u540e\u8ba1\u7b97",
      maxLineLimit !== null
        ? `\u751f\u4ea7\u7ebf\u4e0a\u9650 ${maxLineLimit} \u6761\uff0c\u5f53\u524d\u7d2f\u8ba1\u7ebf\u6570 ${totalLines()} \u6761`
        : "\u4ea7\u7ebf\u4e0a\u9650\u5f85\u89c4\u5219\u53c2\u6570\u786e\u8ba4",
      buildTransferPolicyCheck(recommendedLine),
      dismantleEvaluation ?? "\u62c6\u7ebf\u8bc4\u4f30\u5f85\u6ee1\u7ebf\u6216\u9ad8\u5229\u6da6\u4ea7\u54c1\u51fa\u73b0\u540e\u89e6\u53d1"
    ];

    return {
      year,
      targetMarket,
      targetDemand,
      recommendedLineName: recommendedLine?.name ?? null,
      recommendedNewLineCount,
      lineMix: lineMixSummary,
      targetCapacity,
      capacityGap,
      lineComparison,
      dismantleEvaluation,
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
  const workers: WorkerRule[] = [];
  const incentives: IncentiveRule[] = [];
  const developments: ProductDevelopmentRule[] = [];
  let header: HeaderKind | null = null;
  const budgetReference = parseBudgetReference(fragments);

  for (const fragment of fragments) {
    const initialMatch = fragment.text.match(/\u521d\u59cb\u8d44\u672c\s*[:\uff1a]\s*([0-9]+(?:\.[0-9]+)?)/u);
    if (initialMatch) {
      initialCapital = toNumber(initialMatch[1]);
    }

    const cells = splitCells(fragment.text);
    if (cells.length < 2) {
      continue;
    }

    const inlineIncentiveLift = toNumber(cells[1]);
    if (cells[0]?.includes("\u6fc0\u52b1") && inlineIncentiveLift !== null && !hasCell(cells, text.incentiveName)) {
      incentives.push({ name: cells[0], efficiencyLift: inlineIncentiveLift });
      continue;
    }

    if (hasCell(cells, text.lineName) && hasCell(cells, text.purchasePrice)) {
      header = "line_purchase";
      continue;
    }
    if (hasCell(cells, text.lineName) && hasCell(cells, text.residualValue)) {
      header = "line_maintenance";
      continue;
    }
    if (hasCell(cells, text.workerExpectedSalary)) {
      header = "worker";
      continue;
    }
    if (hasCell(cells, text.incentiveName)) {
      header = "incentive";
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

    if (header === "line_maintenance") {
      const residualValue = toNumber(cells[1]);
      const maintenanceFee = toNumber(cells[2]);
      const juniorWorkerCount = toNumber(cells[3]);
      const seniorWorkerCount = toNumber(cells[4]);
      const depreciationYears = toNumber(cells[6]);
      const line = lines.find((item) => item.name === cells[0]);
      if (line) {
        if (residualValue !== null) {
          line.residualValue = residualValue;
        }
        if (maintenanceFee !== null) {
          line.maintenanceFee = maintenanceFee;
        }
        if (juniorWorkerCount !== null) {
          line.juniorWorkerCount = juniorWorkerCount;
        }
        if (seniorWorkerCount !== null) {
          line.seniorWorkerCount = seniorWorkerCount;
        }
        if (depreciationYears !== null) {
          line.depreciationYears = depreciationYears;
        }
      }
      continue;
    }

    if (header === "worker") {
      const expectedSalary = toNumber(cells[1]);
      const pieceRate = toNumber(cells[2]);
      const quarterlyQuantity = toNumber(cells[3]);
      const efficiency = toNumber(cells[4]);
      if (
        cells[0] &&
        expectedSalary !== null &&
        pieceRate !== null &&
        quarterlyQuantity !== null &&
        efficiency !== null
      ) {
        workers.push({ name: cells[0], expectedSalary, pieceRate, quarterlyQuantity, efficiency });
      }
      continue;
    }

    if (header === "incentive") {
      const efficiencyLift = toNumber(cells[1]);
      if (cells[0] && efficiencyLift !== null) {
        incentives.push({ name: cells[0], efficiencyLift });
      }
      continue;
    }

    if (header === "loan") {
      const limitMultiplier = toNumber(cells[1]);
      const duration = toNumber(cells[2]);
      const rate = toNumber(cells[4]);
      if (cells[0] && limitMultiplier !== null && duration !== null && rate !== null) {
        loans.push({ name: cells[0], limitMultiplier, duration, repaymentMethod: cells[3] ?? "", rate });
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
  const loanCapacity =
    initialCapital !== null && recommendedLoan ? initialCapital * recommendedLoan.limitMultiplier : null;

  const missingEvidence: string[] = [];
  if (initialCapital === null) missingEvidence.push(text.initialCapital);
  if (lines.length === 0) missingEvidence.push("\u4ea7\u7ebf\u53c2\u6570");
  if (loans.length === 0) missingEvidence.push("\u8d37\u6b3e\u53c2\u6570");
  if (managementFee === null) missingEvidence.push(text.managementFee);
  if (maxLineLimit === null) missingEvidence.push(text.maxLineLimit);
  if (!targetY1Row) missingEvidence.push(text.y1Order);
  if (groupCount === null) missingEvidence.push(text.groupCount);

  const linePlanOptions = buildLinePlanOptions(
    lines,
    workers,
    incentives,
    initialCapital,
    loanCapacity,
    recommendedLoan,
    targetY1Row,
    targetY1Demand,
    groupCount,
    maxLineLimit,
    managementFee,
    productDevelopment,
    budgetReference
  );
  const recommendedOption =
    recommendedLine !== null
      ? linePlanOptions.find(
          (option) => option.lineName === recommendedLine.name && option.cashPositiveUntilDelivery
        ) ??
        linePlanOptions.find((option) => option.lineName === recommendedLine.name) ??
        null
      : null;
  const recommendedLineCount = recommendedOption?.lineCount ?? null;
  const estimatedY1Capacity = recommendedOption?.estimatedCapacity ?? null;
  const plannedInvestment = recommendedOption?.preDeliveryFeeTotal ?? null;
  const cashBuffer = recommendedOption?.minPreDeliveryCash ?? null;

  const openingActions = [
    recommendedLine && recommendedLineCount !== null
      ? isFastZeroTransferAutomaticLine(recommendedLine)
        ? `Y1 \u5148\u7528\u81ea\u52a8\u7ebf\u8d5a\u5229\u6da6\uff1a\u8d2d\u4e70 ${recommendedLineCount} \u6761${recommendedLine.name}\uff0c\u5b89\u88c5 ${recommendedLine.installCycle} \u5b63\u3001\u8f6c\u4ea7 0 \u5b63\uff0c\u542b\u878d\u8d44\u53ef\u7528\u8d44\u91d1\u53e3\u5f84\u4f30\u7b97\u4ea7\u80fd ${estimatedY1Capacity} \u4ef6`
        : `\u8d2d\u4e70 ${recommendedLineCount} \u6761${recommendedLine.name}\uff0c\u542b\u878d\u8d44\u53ef\u7528\u8d44\u91d1\u53e3\u5f84\u4f30\u7b97\u4ea7\u80fd ${estimatedY1Capacity} \u4ef6`
      : "\u7b49\u5f85\u4ea7\u7ebf\u53c2\u6570\u540e\u8ba1\u7b97\u8d2d\u7ebf\u6570\u91cf",
    linePlanOptions.length > 0
      ? `\u57fa\u7840\u4ea7\u7ebf\u5bf9\u6807\uff1a\u5df2\u751f\u6210 ${linePlanOptions.length} \u4e2a\u5019\u9009\u65b9\u6848\uff0c\u6309\u51c0\u5229\u6da6\u548c\u4ea4\u8d27\u524d\u73b0\u91d1\u4e3a\u6b63\u6392\u5e8f`
      : "\u57fa\u7840\u4ea7\u7ebf\u5bf9\u6807\u5f85\u4ea7\u7ebf\u3001\u5e02\u573a\u548c\u7ec4\u6570\u8bc1\u636e\u9f50\u5168\u540e\u751f\u6210",
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
      ? `\u542b\u878d\u8d44\u5f00\u5c40\u6295\u8d44\u540e\u73b0\u91d1\u7f13\u51b2\u7ea6 ${cashBuffer} \u5143\uff0c\u82e5\u4e3a\u8d1f\u6570\u9700\u51cf\u5c11\u4ea7\u7ebf\u6216\u8c03\u6574\u878d\u8d44`
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
    lines,
    workers,
    incentives,
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
    yearlyDecisions,
    linePlanOptions
  };
}
