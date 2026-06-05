import type { DocumentUploadResponse } from "../types";

export type StrategyKnowledgeSummary = {
  usableEvidenceCount: number;
  pendingOcrCount: number;
  principles: string[];
  workflow: string[];
};

const rules = [
  {
    keywords: ["\u5173\u952e\u53d8\u91cf", "\u53c2\u8d5b\u7ec4\u6570"],
    principle: "\u5148\u6293\u53d6\u5173\u952e\u53d8\u91cf\uff1a\u4ea7\u7ebf\u3001\u7814\u53d1\u3001\u539f\u6599\u3001\u7ec4\u6570\u3001\u7ba1\u7406\u8d39\u3001\u8d37\u6b3e\u548c\u5e02\u573a\u7206\u53d1\u5e74\u3002"
  },
  {
    keywords: ["\u4ea7\u54c1\u6bdb\u5229", "\u6750\u6599\u8d39"],
    principle: "\u4ea7\u54c1\u4f18\u5148\u7ea7\u6309\u5355\u4f4d\u6bdb\u5229\u6392\u5e8f\uff1a\u552e\u4ef7 - \u6750\u6599\u8d39\u3002"
  },
  {
    keywords: ["\u7ec4\u5747\u5bb9\u91cf", "\u603b\u5bb9\u91cf"],
    principle: "\u5e02\u573a\u5bb9\u91cf\u8981\u5148\u6298\u7b97\u7ec4\u5747\u9700\u6c42\uff1a\u603b\u5bb9\u91cf / \u53c2\u8d5b\u7ec4\u6570\u3002"
  },
  {
    keywords: ["\u9010\u5b63\u63a8\u73b0\u91d1\u6d41", "\u73b0\u91d1\u6d41"],
    principle: "\u7ebf\u6570\u3001\u5e7f\u544a\u548c\u8d37\u6b3e\u8981\u7528\u9010\u5b63\u73b0\u91d1\u6d41\u6821\u9a8c\uff0c\u8dd1\u4e0d\u901a\u5c31\u51cf\u7ebf\u6216\u8c03\u878d\u8d44\u3002"
  },
  {
    keywords: ["\u8f6c\u4ea7\u5468\u671f", "\u81ea\u52a8"],
    principle: "\u81ea\u52a8\u7ebf\u8f6c\u4ea7\u4e0d\u6309\u540d\u5b57\u4e00\u5200\u5207\uff0c\u8981\u770b\u89c4\u5219\u8868\u662f\u5426\u5b58\u5728\u8f6c\u4ea7\u5468\u671f\u3002"
  },
  {
    keywords: ["P3", "P4", "\u7814\u53d1"],
    principle: "P3/P4 \u7814\u53d1\u8981\u63d0\u524d\u5361\u5e02\u573a\u7206\u53d1\u70b9\uff0c\u4e0d\u7b49\u8ba2\u5355\u5230\u624d\u542f\u52a8\u3002"
  }
];

const fallbackPrinciples = rules.map((rule) => rule.principle);

export function buildStrategyKnowledgeSummary(
  upload: DocumentUploadResponse | undefined
): StrategyKnowledgeSummary {
  const fragments = upload?.fragments ?? [];
  const usableFragments = fragments.filter((fragment) => fragment.kind !== "ocr_pending");
  const text = usableFragments.map((fragment) => fragment.text).join("\n");
  const principles = rules
    .filter((rule) => rule.keywords.some((keyword) => text.includes(keyword)))
    .map((rule) => rule.principle);

  const activePrinciples = principles.length > 0 ? principles : fallbackPrinciples;

  return {
    usableEvidenceCount: usableFragments.length,
    pendingOcrCount: upload?.pending_ocr_count ?? 0,
    principles: activePrinciples,
    workflow: [
      "\u6293\u53d6\u89c4\u5219\u53c2\u6570\uff1a\u521d\u59cb\u73b0\u91d1\u3001\u4ea7\u7ebf\u3001\u7814\u53d1\u3001\u8d37\u6b3e\u3001\u7ec4\u6570\u548c\u7ba1\u7406\u8d39\u3002",
      "\u8bfb\u53d6\u5e02\u573a\u8be6\u5355\uff1a\u6309\u5e74\u4efd\u3001\u4ea7\u54c1\u3001\u5bb9\u91cf\u3001\u552e\u4ef7\u548c\u6750\u6599\u8d39\u8ba1\u7b97\u6bdb\u5229\u3002",
      "\u53cd\u63a8\u4ea7\u80fd\u548c\u7ebf\u6570\uff1a\u5148\u770b\u7ec4\u5747\u9700\u6c42\uff0c\u518d\u53d7\u521d\u59cb\u73b0\u91d1\u548c\u878d\u8d44\u4e0a\u9650\u7ea6\u675f\u3002",
      "\u8f93\u51fa\u51b3\u7b56\uff1aY1 \u6253\u57fa\u7840\u548c\u6743\u76ca\uff0cY2-Y4 \u8ddf\u7740\u9ad8\u6bdb\u5229\u4ea7\u54c1\u8f6c\u79fb\uff0c\u6bcf\u6b65\u90fd\u6807\u51fa\u5f85\u786e\u8ba4\u8bc1\u636e\u3002"
    ]
  };
}
