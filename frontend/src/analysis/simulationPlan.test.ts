import { describe, expect, test } from "vitest";
import type { DocumentUploadResponse } from "../types";
import type { MarketAnalysisRow } from "./marketAnalysis";
import { buildOperationPlan } from "./simulationPlan";

const fragment = (text: string) => ({
  text,
  source_file: "rules.xlsx",
  source_location: "table",
  confidence: 1,
  kind: "table"
});

const marketRows: MarketAnalysisRow[] = [
  {
    id: "Y1-P2",
    year: "Y1",
    product: "P2",
    capacity: 160,
    groupAverageCapacity: 20,
    price: 40,
    cost: 18,
    unitMargin: 22,
    marginRate: 0.55,
    confidence: 1,
    source: "market.xlsx"
  },
  {
    id: "Y2-P3",
    year: "Y2",
    product: "P3",
    capacity: 200,
    groupAverageCapacity: 25,
    price: 55,
    cost: 25,
    unitMargin: 30,
    marginRate: 0.55,
    confidence: 1,
    source: "market.xlsx"
  }
];

const profitableMarketRows: MarketAnalysisRow[] = [
  {
    id: "Y1-P2-profitable",
    year: "Y1",
    product: "P2",
    capacity: 160,
    groupAverageCapacity: 20,
    price: 40000,
    cost: 18000,
    unitMargin: 22000,
    marginRate: 0.55,
    confidence: 1,
    source: "market.xlsx"
  }
];

const largeDemandMarketRows: MarketAnalysisRow[] = [
  {
    id: "Y1-P2-large-demand",
    year: "Y1",
    product: "P2",
    capacity: 4000,
    groupAverageCapacity: 200,
    price: 7800,
    cost: 2600,
    unitMargin: 5200,
    marginRate: 0.67,
    confidence: 1,
    source: "market.xlsx"
  }
];

function rulesUpload(lineRow: string): DocumentUploadResponse {
  return {
    id: 1,
    filename: "rules.xlsx",
    document_type: "rules",
    status: "extracted",
    fragment_count: 8,
    pending_ocr_count: 0,
    fragments: [
      fragment("\u521d\u59cb\u8d44\u672c\uff1a780000"),
      fragment(
        "\u7ebf\u578b\u540d\u79f0 | \u8d2d\u4e70\u4ef7\u683c\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf | \u8f6c\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u8f6c\u4ea7\u4ef7\u683c\uff08\u5143\uff09"
      ),
      fragment(lineRow),
      fragment("\u8d37\u6b3e\u540d\u79f0 | \u989d\u5ea6\u4e0a\u9650\uff08\u500d\uff09 | \u8d37\u6b3e\u65f6\u95f4\uff08\u5b63\uff09 | \u8fd8\u6b3e\u65b9\u5f0f | \u5229\u7387\uff08%\uff09"),
      fragment("\u957f\u671f\u94f6\u884c\u878d\u8d44 | 3 | 4 | \u672c\u606f\u540c\u8fd8 | 10%"),
      fragment("\u8d39\u7528\u540d\u79f0 | \u8d39\u7528"),
      fragment("\u7ba1\u7406\u8d39\u7528 | 12000"),
      fragment("\u89c4\u5219\u540d\u79f0 | \u89c4\u5219\u503c"),
      fragment("\u751f\u4ea7\u7ebf\u4e0a\u9650 | 16")
    ]
  };
}

function multiLineRulesUpload(): DocumentUploadResponse {
  return {
    id: 1,
    filename: "rules.xlsx",
    document_type: "rules",
    status: "extracted",
    fragment_count: 11,
    pending_ocr_count: 0,
    fragments: [
      fragment("\u521d\u59cb\u8d44\u672c\uff1a780000"),
      fragment(
        "\u7ebf\u578b\u540d\u79f0 | \u8d2d\u4e70\u4ef7\u683c\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf | \u8f6c\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u8f6c\u4ea7\u4ef7\u683c\uff08\u5143\uff09"
      ),
      fragment("\u81ea\u52a8\u7ebf | 200000 | 1 | 1 | 20 | 0 | 0"),
      fragment("\u667a\u80fd\u7ebf | 300000 | 1 | 1 | 30 | 0 | 0"),
      fragment("\u8d37\u6b3e\u540d\u79f0 | \u989d\u5ea6\u4e0a\u9650\uff08\u500d\uff09 | \u8d37\u6b3e\u65f6\u95f4\uff08\u5b63\uff09 | \u8fd8\u6b3e\u65b9\u5f0f | \u5229\u7387\uff08%\uff09"),
      fragment("\u957f\u671f\u94f6\u884c\u878d\u8d44 | 3 | 4 | \u672c\u606f\u540c\u8fd8 | 10%"),
      fragment("\u8d39\u7528\u540d\u79f0 | \u8d39\u7528"),
      fragment("\u7ba1\u7406\u8d39\u7528 | 12000"),
      fragment("\u89c4\u5219\u540d\u79f0 | \u89c4\u5219\u503c"),
      fragment("\u751f\u4ea7\u7ebf\u4e0a\u9650 | 16"),
      fragment("\u4ea7\u54c1\u540d\u79f0 | \u6d88\u8017\u91d1\u94b1 | \u7814\u53d1\u5468\u671f"),
      fragment("P2 | 30000 | 2")
    ]
  };
}

function rulesWithWorkerTableUpload(): DocumentUploadResponse {
  return {
    id: 1,
    filename: "rules.xlsx",
    document_type: "rules",
    status: "extracted",
    fragment_count: 15,
    pending_ocr_count: 0,
    fragments: [
      fragment("\u521d\u59cb\u8d44\u672c\uff1a780000"),
      fragment(
        "\u7ebf\u578b\u540d\u79f0 | \u8d2d\u4e70\u4ef7\u683c\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf | \u8f6c\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u8f6c\u4ea7\u4ef7\u683c\uff08\u5143\uff09"
      ),
      fragment("\u81ea\u52a8\u7ebf | 200000 | 1 | 1 | 20 | 0 | 0"),
      fragment("\u667a\u80fd\u7ebf | 300000 | 1 | 1 | 30 | 0 | 0"),
      fragment("\u540d\u79f0 | \u521d\u59cb\u671f\u671b\u5de5\u8d44\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf"),
      fragment("\u521d\u7ea7\u5de5 | 2500 | 1 | 1 | 55"),
      fragment("\u9ad8\u7ea7\u5de5 | 5500 | 1 | 1 | 65"),
      fragment("\u8d37\u6b3e\u540d\u79f0 | \u989d\u5ea6\u4e0a\u9650\uff08\u500d\uff09 | \u8d37\u6b3e\u65f6\u95f4\uff08\u5b63\uff09 | \u8fd8\u6b3e\u65b9\u5f0f | \u5229\u7387\uff08%\uff09"),
      fragment("\u957f\u671f\u94f6\u884c\u878d\u8d44 | 3 | 4 | \u672c\u606f\u540c\u8fd8 | 10%"),
      fragment("\u8d39\u7528\u540d\u79f0 | \u8d39\u7528"),
      fragment("\u7ba1\u7406\u8d39\u7528 | 12000"),
      fragment("\u89c4\u5219\u540d\u79f0 | \u89c4\u5219\u503c"),
      fragment("\u751f\u4ea7\u7ebf\u4e0a\u9650 | 16"),
      fragment("\u4ea7\u54c1\u540d\u79f0 | \u6d88\u8017\u91d1\u94b1 | \u7814\u53d1\u5468\u671f"),
      fragment("P2 | 30000 | 2")
    ]
  };
}

function userScenarioRulesUpload(): DocumentUploadResponse {
  return {
    id: 1,
    filename: "rules.xlsx",
    document_type: "rules",
    status: "extracted",
    fragment_count: 10,
    pending_ocr_count: 0,
    fragments: [
      fragment("\u521d\u59cb\u8d44\u672c\uff1a780000"),
      fragment(
        "\u7ebf\u578b\u540d\u79f0 | \u8d2d\u4e70\u4ef7\u683c\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf | \u8f6c\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u8f6c\u4ea7\u4ef7\u683c\uff08\u5143\uff09"
      ),
      fragment("\u667a\u80fd\u7ebf | 300000 | 2 | 1 | 22 | 0 | 0"),
      fragment("\u8d37\u6b3e\u540d\u79f0 | \u989d\u5ea6\u4e0a\u9650\uff08\u500d\uff09 | \u8d37\u6b3e\u65f6\u95f4\uff08\u5b63\uff09 | \u8fd8\u6b3e\u65b9\u5f0f | \u5229\u7387\uff08%\uff09"),
      fragment("\u957f\u671f\u94f6\u884c\u878d\u8d44 | 3 | 8 | \u6bcf\u5b63\u4ed8\u606f\uff0c\u5230\u671f\u8fd8\u672c | 3%"),
      fragment("\u8d39\u7528\u540d\u79f0 | \u8d39\u7528"),
      fragment("\u7ba1\u7406\u8d39\u7528 | 4000"),
      fragment("\u89c4\u5219\u540d\u79f0 | \u89c4\u5219\u503c"),
      fragment("\u751f\u4ea7\u7ebf\u4e0a\u9650 | 16"),
      fragment("\u4ea7\u54c1\u540d\u79f0 | \u6d88\u8017\u91d1\u94b1 | \u7814\u53d1\u5468\u671f"),
      fragment("P2 | 30000 | 2")
    ]
  };
}

describe("buildOperationPlan automatic line transfer policy", () => {
  test("does not recommend transfer when an automatic line has a transfer cycle", () => {
    const plan = buildOperationPlan(
      rulesUpload("\u81ea\u52a8\u7ebf | 200000 | 1 | 1 | 20 | 1 | 50000"),
      marketRows,
      8
    );

    expect(plan.riskChecks.join("\n")).toContain("\u8f6c\u4ea7\u5468\u671f 1 \u5b63");
    expect(plan.yearlyDecisions[1]?.checks.join("\n")).toContain("\u4e0d\u8f6c\u4ea7");
  });

  test("allows transfer when an automatic line transfer cycle is zero", () => {
    const plan = buildOperationPlan(
      rulesUpload("\u81ea\u52a8\u7ebf | 200000 | 1 | 1 | 20 | 0 | 0"),
      marketRows,
      8
    );

    expect(plan.riskChecks.join("\n")).toContain("\u8f6c\u4ea7\u5468\u671f 0 \u5b63");
    expect(plan.yearlyDecisions[1]?.checks.join("\n")).toContain("\u53ef\u8f6c\u4ea7");
  });
});

describe("buildOperationPlan line plan comparison", () => {
  test("compares line-count candidates by ad target, ad cash, and net profit", () => {
    const plan = buildOperationPlan(multiLineRulesUpload(), profitableMarketRows, 8);

    expect(plan.linePlanOptions.length).toBeGreaterThanOrEqual(3);

    const automaticBase = plan.linePlanOptions.find(
      (option) => option.lineName === "\u81ea\u52a8\u7ebf" && option.lineCount === 1
    );
    expect(automaticBase).toMatchObject({
      targetRank: 1,
      targetOrderQuantity: 20,
      estimatedCapacity: 20,
      adPointCash: 2878000,
      reasonableAdAmount: 44000,
      netProfit: 342000,
      cashPositiveUntilDelivery: true
    });
    expect(automaticBase?.earlyFees.map((fee) => fee.label)).toEqual([
      "\u8d2d\u4e70\u4ea7\u7ebf",
      "\u4ea7\u54c1\u7814\u53d1",
      "Q1 \u7ba1\u7406\u8d39",
      "Q2 \u7ba1\u7406\u8d39"
    ]);

    const automaticAggressive = plan.linePlanOptions.find(
      (option) => option.lineName === "\u81ea\u52a8\u7ebf" && option.lineCount === 2
    );
    expect(automaticAggressive).toMatchObject({
      targetRank: 2,
      targetOrderQuantity: 40,
      reasonableAdAmount: 123200,
      netProfit: 702800
    });

    expect(plan.linePlanOptions[0]?.netProfit).toBeGreaterThanOrEqual(plan.linePlanOptions[1]?.netProfit ?? 0);
    expect(plan.openingActions.join("\n")).toContain("\u57fa\u7840\u4ea7\u7ebf\u5bf9\u6807");
  });

  test("does not treat worker rows as production line candidates", () => {
    const plan = buildOperationPlan(rulesWithWorkerTableUpload(), profitableMarketRows, 8);
    const optionNames = plan.linePlanOptions.map((option) => option.lineName);

    expect(optionNames).toContain("\u81ea\u52a8\u7ebf");
    expect(optionNames).toContain("\u667a\u80fd\u7ebf");
    expect(optionNames).not.toContain("\u521d\u7ea7\u5de5");
    expect(optionNames).not.toContain("\u9ad8\u7ea7\u5de5");
  });

  test("uses loan capacity when recommending opening line count", () => {
    const plan = buildOperationPlan(userScenarioRulesUpload(), largeDemandMarketRows, 20);

    expect(plan.loanCapacity).toBe(2340000);
    expect(plan.recommendedLine?.name).toBe("\u667a\u80fd\u7ebf");
    expect(plan.recommendedLineCount).toBe(9);
    expect(plan.estimatedY1Capacity).toBe(198);
    expect(plan.plannedInvestment).toBe(2952600);
    expect(plan.cashBuffer).toBe(64440);
    expect(plan.openingActions.join("\n")).toContain("\u542b\u878d\u8d44");

    const nineSmart = plan.linePlanOptions.find(
      (option) => option.lineName === "\u667a\u80fd\u7ebf" && option.lineCount === 9
    );
    expect(nineSmart).toMatchObject({
      cashPositiveUntilDelivery: true,
      adPointCash: 315800,
      reasonableAdAmount: 102960,
      minPreDeliveryCash: 64440
    });
    expect(nineSmart?.cashTimeline).toEqual([
      { quarter: "Q1", balance: 212840 },
      { quarter: "Q2", balance: 138640 },
      { quarter: "Q3", balance: 64440 }
    ]);

    const tenSmart = plan.linePlanOptions.find(
      (option) => option.lineName === "\u667a\u80fd\u7ebf" && option.lineCount === 10
    );
    expect(tenSmart).toMatchObject({
      cashPositiveUntilDelivery: false,
      adPointCash: 15800,
      reasonableAdAmount: 0,
      minPreDeliveryCash: -132600
    });
    expect(tenSmart?.cashTimeline).toEqual([
      { quarter: "Q1", balance: 15800 },
      { quarter: "Q2", balance: -58400 },
      { quarter: "Q3", balance: -132600 }
    ]);
  });
});
