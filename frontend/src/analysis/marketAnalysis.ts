import type { DocumentUploadResponse, ExtractedFragment } from "../types";

export type MarketAnalysisRow = {
  id: string;
  year: string;
  product: string;
  capacity: number;
  groupAverageCapacity: number | null;
  price: number;
  cost: number | null;
  unitMargin: number | null;
  marginRate: number | null;
  confidence: number;
  source: string;
};

export type MarketAnalysisResult = {
  groupCount: number | null;
  detectedGroupCount: number | null;
  rows: MarketAnalysisRow[];
  pendingOcrCount: number;
  evidenceCount: number;
};

export type GroupCountEvidence = {
  value: number;
  source_file: string;
  source_location: string;
  confidence: number;
};

const numberPattern = "([0-9]+(?:\\.[0-9]+)?)";
const groupCountPattern = new RegExp(
  `(?:组数|参赛组数|队伍数|团队数)\\s*[:：]?\\s*${numberPattern}`,
  "iu"
);
const marketRowPattern = new RegExp(
  [
    "Y\\s*([1-4])",
    ".*?",
    "P\\s*([1-4])",
    ".*?",
    `(?:市场容量|容量|市场大小)\\s*[:：]?\\s*${numberPattern}`,
    ".*?",
    `(?:价格|售价|单价)\\s*[:：]?\\s*${numberPattern}`,
    ".*?",
    `(?:成本|材料成本|单位成本)\\s*[:：]?\\s*${numberPattern}`
  ].join(""),
  "giu"
);
const productPattern = /^P\s*([1-4])$/iu;
const inlineProductCostPattern = new RegExp(
  `P\\s*([1-4]).*?(?:产品成本|单位成本|成本)\\s*[:：]?\\s*${numberPattern}`,
  "giu"
);
const materialPattern = /^R\s*([1-4])$/iu;

type TableHeader = {
  productIndex: number;
  costIndex?: number;
  materialNameIndex?: number;
  materialPriceIndex?: number;
  materialQuantityIndexes?: Map<string, number>;
  yearIndex?: number;
  priceIndex?: number;
  quantityIndex?: number;
};

type OrderAggregate = {
  year: string;
  product: string;
  capacity: number;
  weightedPrice: number;
  confidence: number;
  sources: Set<string>;
};

function toNumber(value: string) {
  return Number.parseFloat(value);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function fragmentSource(fragment: ExtractedFragment) {
  return `${fragment.source_file} / ${fragment.source_location}`;
}

function splitCells(text: string) {
  return text.split("|").map((cell) => cell.trim());
}

function findCellIndex(cells: string[], matcher: (cell: string) => boolean) {
  return cells.findIndex((cell) => matcher(cell));
}

function parseProductName(cell: string) {
  const match = productPattern.exec(cell.trim());
  productPattern.lastIndex = 0;
  return match ? `P${match[1]}` : null;
}

function parseMaterialName(cell: string) {
  const match = materialPattern.exec(cell.trim());
  materialPattern.lastIndex = 0;
  return match ? `R${match[1]}` : null;
}

function parseMaterialPriceHeader(cells: string[]): TableHeader | null {
  const materialNameIndex = findCellIndex(cells, (cell) => cell.includes("材料名称"));
  const materialPriceIndex = findCellIndex(cells, (cell) => cell.includes("基础价格") || cell.includes("材料价格"));
  if (materialNameIndex === -1 || materialPriceIndex === -1) {
    return null;
  }
  return { productIndex: -1, materialNameIndex, materialPriceIndex };
}

function parseProductCostHeader(cells: string[]): TableHeader | null {
  const productIndex = findCellIndex(cells, (cell) => cell === "产品名" || cell === "产品");
  const costIndex = findCellIndex(cells, (cell) => cell.includes("产品成本") || cell === "成本");
  const materialQuantityIndexes = new Map<string, number>();

  cells.forEach((cell, index) => {
    const material = parseMaterialName(cell);
    if (material) {
      materialQuantityIndexes.set(material, index);
    }
  });

  if (productIndex === -1 || costIndex === -1) {
    return null;
  }
  return { productIndex, costIndex, materialQuantityIndexes };
}

function parseOrderHeader(cells: string[]): TableHeader | null {
  const yearIndex = findCellIndex(cells, (cell) => cell === "年份" || cell === "年");
  const productIndex = findCellIndex(cells, (cell) => cell === "产品");
  const priceIndex = findCellIndex(cells, (cell) => cell.includes("参考价格") || cell.includes("价格") || cell.includes("售价"));
  const quantityIndex = findCellIndex(cells, (cell) => cell === "数量" || cell.includes("容量"));

  if ([yearIndex, productIndex, priceIndex, quantityIndex].some((index) => index === -1)) {
    return null;
  }

  return { yearIndex, productIndex, priceIndex, quantityIndex };
}

export function parseProductCosts(fragments: ExtractedFragment[]) {
  const costs = new Map<string, number>();
  const materialPrices = new Map<string, number>();
  const fallbackProductCosts = new Map<string, number>();
  let materialPriceHeader: TableHeader | null = null;
  let productCostHeader: TableHeader | null = null;

  for (const fragment of fragments) {
    const cells = splitCells(fragment.text);
    const nextMaterialHeader = parseMaterialPriceHeader(cells);
    if (nextMaterialHeader) {
      materialPriceHeader = nextMaterialHeader;
      productCostHeader = null;
      continue;
    }

    const nextHeader = parseProductCostHeader(cells);
    if (nextHeader) {
      productCostHeader = nextHeader;
      materialPriceHeader = null;
      continue;
    }

    if (
      materialPriceHeader?.materialNameIndex !== undefined &&
      materialPriceHeader.materialPriceIndex !== undefined
    ) {
      const material = parseMaterialName(cells[materialPriceHeader.materialNameIndex] ?? "");
      const price = toNumber(cells[materialPriceHeader.materialPriceIndex] ?? "");
      if (material && Number.isFinite(price)) {
        materialPrices.set(material, price);
        continue;
      }
    }

    if (productCostHeader?.costIndex !== undefined) {
      const product = parseProductName(cells[productCostHeader.productIndex] ?? "");
      const fallbackCost = toNumber(cells[productCostHeader.costIndex] ?? "");
      if (product && Number.isFinite(fallbackCost)) {
        fallbackProductCosts.set(product, fallbackCost);
      }

      let materialCost = 0;
      let canCalculateMaterialCost = false;
      for (const [material, index] of productCostHeader.materialQuantityIndexes ?? []) {
        const quantity = toNumber(cells[index] ?? "");
        if (!Number.isFinite(quantity) || quantity <= 0) {
          continue;
        }
        const materialPrice = materialPrices.get(material);
        if (materialPrice === undefined) {
          canCalculateMaterialCost = false;
          materialCost = 0;
          break;
        }
        canCalculateMaterialCost = true;
        materialCost += quantity * materialPrice;
      }

      if (product && canCalculateMaterialCost && materialCost > 0) {
        costs.set(product, round(materialCost));
        continue;
      }
    }

    for (const match of fragment.text.matchAll(inlineProductCostPattern)) {
      const product = `P${match[1]}`;
      const cost = toNumber(match[2]);
      if (Number.isFinite(cost)) {
        fallbackProductCosts.set(product, cost);
      }
    }
    inlineProductCostPattern.lastIndex = 0;
  }

  for (const [product, fallbackCost] of fallbackProductCosts) {
    if (!costs.has(product)) {
      costs.set(product, fallbackCost);
    }
  }

  return costs;
}

export function findGroupCountEvidence(fragments: ExtractedFragment[]): GroupCountEvidence | null {
  for (const fragment of fragments) {
    const match = groupCountPattern.exec(fragment.text);
    groupCountPattern.lastIndex = 0;
    if (match) {
      const count = toNumber(match[1]);
      if (Number.isFinite(count) && count > 0) {
        return {
          value: count,
          source_file: fragment.source_file,
          source_location: fragment.source_location,
          confidence: fragment.confidence
        };
      }
    }
  }
  return null;
}

function parseInlineRows(
  fragments: ExtractedFragment[],
  groupCount: number | null
) {
  const rows: MarketAnalysisRow[] = [];

  for (const fragment of fragments) {
    for (const match of fragment.text.matchAll(marketRowPattern)) {
      const year = `Y${match[1]}`;
      const product = `P${match[2]}`;
      const capacity = toNumber(match[3]);
      const price = toNumber(match[4]);
      const cost = toNumber(match[5]);

      if (![capacity, price, cost].every(Number.isFinite)) {
        continue;
      }

      const unitMargin = price - cost;
      rows.push({
        id: `${year}-${product}-${rows.length}`,
        year,
        product,
        capacity,
        groupAverageCapacity: groupCount ? round(capacity / groupCount) : null,
        price,
        cost,
        unitMargin: round(unitMargin),
        marginRate: price > 0 ? unitMargin / price : null,
        confidence: fragment.confidence,
        source: fragmentSource(fragment)
      });
    }
    marketRowPattern.lastIndex = 0;
  }

  return rows;
}

function parseOrderTableRows(
  fragments: ExtractedFragment[],
  productCosts: Map<string, number>,
  groupCount: number | null
) {
  const aggregates = new Map<string, OrderAggregate>();
  let orderHeader: TableHeader | null = null;

  for (const fragment of fragments) {
    const cells = splitCells(fragment.text);
    const nextHeader = parseOrderHeader(cells);
    if (nextHeader) {
      orderHeader = nextHeader;
      continue;
    }

    if (
      !orderHeader ||
      orderHeader.yearIndex === undefined ||
      orderHeader.priceIndex === undefined ||
      orderHeader.quantityIndex === undefined
    ) {
      continue;
    }

    const yearNumber = toNumber(cells[orderHeader.yearIndex] ?? "");
    const product = parseProductName(cells[orderHeader.productIndex] ?? "");
    const price = toNumber(cells[orderHeader.priceIndex] ?? "");
    const quantity = toNumber(cells[orderHeader.quantityIndex] ?? "");

    if (!Number.isFinite(yearNumber) || !product || !Number.isFinite(price) || !Number.isFinite(quantity)) {
      continue;
    }

    const year = `Y${Math.trunc(yearNumber)}`;
    const key = `${year}-${product}`;
    const aggregate =
      aggregates.get(key) ??
      ({
        year,
        product,
        capacity: 0,
        weightedPrice: 0,
        confidence: fragment.confidence,
        sources: new Set<string>()
      } satisfies OrderAggregate);

    aggregate.capacity += quantity;
    aggregate.weightedPrice += price * quantity;
    aggregate.confidence = Math.min(aggregate.confidence, fragment.confidence);
    aggregate.sources.add(fragmentSource(fragment));
    aggregates.set(key, aggregate);
  }

  return Array.from(aggregates.values())
    .sort((left, right) => left.year.localeCompare(right.year) || left.product.localeCompare(right.product))
    .map<MarketAnalysisRow>((aggregate, index) => {
      const price = aggregate.capacity > 0 ? round(aggregate.weightedPrice / aggregate.capacity) : 0;
      const cost = productCosts.get(aggregate.product) ?? null;
      const unitMargin = cost === null ? null : round(price - cost);

      return {
        id: `${aggregate.year}-${aggregate.product}-order-${index}`,
        year: aggregate.year,
        product: aggregate.product,
        capacity: round(aggregate.capacity),
        groupAverageCapacity: groupCount ? round(aggregate.capacity / groupCount) : null,
        price,
        cost,
        unitMargin,
        marginRate: unitMargin !== null && price > 0 ? unitMargin / price : null,
        confidence: aggregate.confidence,
        source: Array.from(aggregate.sources).slice(0, 2).join("; ")
      };
    });
}

function parseRows(
  fragments: ExtractedFragment[],
  groupCount: number | null,
  productCosts: Map<string, number>
) {
  const inlineRows = parseInlineRows(fragments, groupCount);
  const orderRows = parseOrderTableRows(fragments, productCosts, groupCount);
  return [...inlineRows, ...orderRows];
}

export function buildMarketAnalysis(
  upload: DocumentUploadResponse | undefined,
  confirmedGroupCount: number | null = null,
  rulesUpload: DocumentUploadResponse | undefined = undefined
): MarketAnalysisResult {
  const fragments = upload?.fragments ?? [];
  const productCosts = parseProductCosts(rulesUpload?.fragments ?? []);
  const detectedGroupCount = findGroupCountEvidence(fragments)?.value ?? null;

  return {
    groupCount: confirmedGroupCount,
    detectedGroupCount,
    rows: parseRows(fragments, confirmedGroupCount, productCosts),
    pendingOcrCount: upload?.pending_ocr_count ?? 0,
    evidenceCount: fragments.length
  };
}

export function formatMarketNumber(value: number | null) {
  if (value === null) {
    return "待确认";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatMarginRate(value: number | null) {
  if (value === null) {
    return "待确认";
  }
  return `${Math.round(value * 100)}%`;
}
