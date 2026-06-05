import type { DocumentUploadResponse, ExtractedFragment, ParameterCandidate } from "../types";
import { parseProductCosts } from "./marketAnalysis";

type HeaderState = {
  name: string;
  cells: string[];
};

const moneyUnit = "元";
const cycleUnit = "季";

function splitCells(text: string) {
  return text.split("|").map((cell) => cell.trim());
}

function source(fragment: ExtractedFragment) {
  return {
    source_file: fragment.source_file,
    source_location: fragment.source_location,
    confidence: fragment.confidence
  };
}

function parameter(
  fragment: ExtractedFragment,
  key: string,
  label: string,
  value: string,
  unit: string | null,
  impact: string,
  critical = true
): ParameterCandidate {
  return {
    key,
    label,
    value,
    unit,
    ...source(fragment),
    impact,
    critical,
    status: fragment.confidence >= 0.99 ? "confirmed" : critical ? "requires_confirmation" : "candidate"
  };
}

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[（）()]/g, "")
    .replace(/[%]/g, "percent")
    .replace(/\s+/g, "_");
}

function pushGenericTableParameters(
  parameters: ParameterCandidate[],
  fragment: ExtractedFragment,
  namespace: string,
  rowName: string,
  rowLabel: string,
  headerCells: string[],
  valueCells: string[],
  impact: string
) {
  for (let index = 1; index < Math.min(headerCells.length, valueCells.length); index += 1) {
    const value = valueCells[index];
    if (!value) {
      continue;
    }
    const header = headerCells[index];
    const unit = header.includes("金钱") || header.includes("价格") || header.includes("费用") || header.includes("工资")
      ? moneyUnit
      : header.includes("时间") || header.includes("周期") || header.includes("账期")
        ? cycleUnit
        : header.includes("利率") || header.includes("贴息") || header.includes("效率") || header.includes("折价率") || header.includes("税率") || header.includes("比例") || header.includes("涨幅") || header.includes("损失")
          ? "%"
          : header.includes("产量") || header.includes("数量") || header.includes("上限") || header.includes("倍")
            ? null
            : null;

    parameters.push(
      parameter(
        fragment,
        `${namespace}.${normalizeToken(rowName)}.${normalizeToken(header)}`,
        `${rowLabel} ${header}`,
        value,
        unit,
        impact
      )
    );
  }
}

function pushProductBomParameters(
  parameters: ParameterCandidate[],
  fragment: ExtractedFragment,
  product: string,
  headerCells: string[],
  valueCells: string[]
) {
  for (let index = 1; index < Math.min(headerCells.length, valueCells.length); index += 1) {
    const header = headerCells[index];
    const value = valueCells[index];
    if (!value || !/^R[1-4]$/i.test(header)) {
      continue;
    }
    parameters.push(
      parameter(
        fragment,
        `product.${product.toLowerCase()}.bom.${header.toLowerCase()}`,
        `${product} ${header} 用量`,
        value,
        null,
        "用于按 BOM 与材料基础价格计算产品材料费"
      )
    );
  }
}

export function buildRuleParameters(upload: DocumentUploadResponse | undefined): ParameterCandidate[] {
  const fragments = upload?.fragments ?? [];
  const parameters: ParameterCandidate[] = [];
  const productMaterialCosts = parseProductCosts(fragments);
  let header: HeaderState | null = null;

  for (const fragment of fragments) {
    const initialCapital = fragment.text.match(/初始资本\s*[:：]\s*([0-9]+(?:\.[0-9]+)?)/u);
    if (initialCapital) {
      parameters.push(
        parameter(
          fragment,
          "finance.initial_capital",
          "初始资本",
          initialCapital[1],
          moneyUnit,
          "影响第一年开局可购产线、研发、认证、原料和融资缺口"
        )
      );
    }

    const cells = splitCells(fragment.text);
    if (cells.length < 2) {
      continue;
    }

    const firstCell = cells[0];
    if (fragment.text.includes("|") && !/^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(firstCell.replace(/\s/g, ""))) {
      continue;
    }

    if (cells.includes("认证名称")) {
      header = { name: "certification", cells };
      continue;
    }
    if (cells.includes("市场名称")) {
      header = { name: "market_development", cells };
      continue;
    }
    if (cells.includes("特性名称")) {
      header = { name: "feature_design", cells };
      continue;
    }
    if (cells.includes("材料名称")) {
      header = { name: "material", cells };
      continue;
    }
    if (cells.includes("产品名")) {
      header = { name: "product", cells };
      continue;
    }
    if (cells.includes("产品名称")) {
      header = { name: "product_blueprint", cells };
      continue;
    }
    if (cells.includes("线型名称") && cells.includes("购买价格（元）")) {
      header = { name: "production_line.purchase", cells };
      continue;
    }
    if (cells.includes("线型名称") && cells.includes("残值（元）")) {
      header = { name: "production_line.maintenance", cells };
      continue;
    }
    if (cells.includes("资产名称")) {
      header = { name: "asset_disposal", cells };
      continue;
    }
    if (cells.includes("名称") && cells.includes("初始期望工资（元）")) {
      header = { name: "worker", cells };
      continue;
    }
    if (cells.includes("培训名称")) {
      header = { name: "training", cells };
      continue;
    }
    if (cells.includes("贷款名称")) {
      header = { name: "loan", cells };
      continue;
    }
    if (cells.includes("名称") && cells.includes("贴息（%）")) {
      header = { name: "discount", cells };
      continue;
    }
    if (cells.includes("费用名称")) {
      header = { name: "fee", cells };
      continue;
    }
    if (cells.includes("规则名称")) {
      header = { name: "basic_rule", cells };
      continue;
    }
    if (cells.includes("班次名称")) {
      header = { name: "shift", cells };
      continue;
    }
    if (cells.includes("激励名称")) {
      header = { name: "incentive", cells };
      continue;
    }
    if (cells.includes("岗位名称")) {
      header = { name: "digital_role", cells };
      continue;
    }

    if (!header) {
      continue;
    }

    const rowName = cells[0];
    if (!rowName) {
      continue;
    }

    if (header.name === "product") {
      pushGenericTableParameters(
        parameters,
        fragment,
        header.name,
        rowName,
        rowName,
        header.cells,
        cells,
        "影响产品材料费、转产方向和产品利润测算"
      );
      pushProductBomParameters(parameters, fragment, rowName, header.cells, cells);
      const materialCost = productMaterialCosts.get(rowName);
      if (materialCost !== undefined) {
        parameters.push(
          parameter(
            fragment,
            `product.${rowName.toLowerCase()}.material_cost`,
            `${rowName} 材料费`,
            String(materialCost),
            moneyUnit,
            "由规则材料基础价格和产品 BOM 计算，用于产品单位毛利"
          )
        );
      }
      continue;
    }

    const impact =
      header.name === "production_line.purchase" || header.name === "production_line.maintenance"
        ? "影响产线选择、产能、安装节奏、维修和现金流"
        : header.name === "loan"
          ? "影响融资额度、利息和逐季现金流"
          : header.name === "worker" || header.name === "training"
            ? "影响产能效率、工资、计件费用和激励策略"
            : header.name === "material"
              ? "影响产品材料费、采购现金流和到货节奏"
              : "影响四年经营方案推演";

    pushGenericTableParameters(
      parameters,
      fragment,
      header.name,
      rowName,
      rowName,
      header.cells,
      cells,
      impact
    );
  }

  return parameters;
}
