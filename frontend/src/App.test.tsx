import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import App from "./App";
import { importLocalKnowledge, uploadDocument } from "./api/client";

vi.mock("./api/client", () => ({
  importLocalKnowledge: vi.fn(),
  uploadDocument: vi.fn()
}));

describe("App interactions", () => {
  beforeEach(() => {
    vi.mocked(importLocalKnowledge).mockReset();
    vi.mocked(uploadDocument).mockReset();
  });

  test("switches workbench sections when sidebar options are clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "市场分析" }));

    expect(screen.getByRole("heading", { level: 2, name: "市场分析" })).toBeInTheDocument();
    expect(screen.getByText(/暂无可计算的市场数据/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "方案推演" }));

    expect(screen.getByRole("heading", { level: 2, name: "方案推演" })).toBeInTheDocument();
    expect(screen.getByText(/当前还不能输出第一年或后四年运营方案/)).toBeInTheDocument();
  });

  test("confirms detected parameter candidates from the table", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 9,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 1,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "组数 8",
          source_file: "market.xlsx",
          source_location: "sheet 参数",
          confidence: 0.95,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "参数确认" }));
    await user.click(screen.getByRole("button", { name: "确认 参赛组数" }));

    expect(screen.getByText("已确认")).toBeInTheDocument();
    expect(screen.queryByText("不可用于最终推演")).not.toBeInTheDocument();
  });

  test("adds extracted rule parameters to the confirmation table", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 12,
      filename: "rules.docx",
      document_type: "rules",
      status: "extracted",
      fragment_count: 12,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "一、初始资本：780000元",
          source_file: "rules.docx",
          source_location: "paragraph 2",
          confidence: 1,
          kind: "text"
        },
        {
          text: "材料名称 | 基础价格（元） | 数量 | 送货周期（季） | 账期（季）",
          source_file: "rules.docx",
          source_location: "table 4 row 1",
          confidence: 1,
          kind: "table"
        },
        {
          text: "R1 | 800 | 450000 | 1 | 0",
          source_file: "rules.docx",
          source_location: "table 4 row 2",
          confidence: 1,
          kind: "table"
        },
        {
          text: "R2 | 800 | 450000 | 1 | 0",
          source_file: "rules.docx",
          source_location: "table 4 row 3",
          confidence: 1,
          kind: "table"
        },
        {
          text: "R4 | 1000 | 450000 | 1 | 0",
          source_file: "rules.docx",
          source_location: "table 4 row 5",
          confidence: 1,
          kind: "table"
        },
        {
          text: "产品名 | 碳排放量 | 开产费用 | 产品成本 | R1 | R2 | R3 | R4",
          source_file: "rules.docx",
          source_location: "table 5 row 1",
          confidence: 1,
          kind: "table"
        },
        {
          text: "P2 | 0 | 0 | 5000 | 1 | 1 | 0 | 1",
          source_file: "rules.docx",
          source_location: "table 5 row 3",
          confidence: 1,
          kind: "table"
        },
        {
          text: "线型名称 | 购买价格（元） | 安装周期（季） | 生产周期（季） | 产量 | 转产周期（季） | 转产价格（元）",
          source_file: "rules.docx",
          source_location: "table 7 row 1",
          confidence: 1,
          kind: "table"
        },
        {
          text: "智能线 | 300000 | 2 | 1 | 22 | 0 | 0",
          source_file: "rules.docx",
          source_location: "table 7 row 4",
          confidence: 1,
          kind: "table"
        },
        {
          text: "贷款名称 | 额度上限（倍） | 贷款时间（季） | 还款方式 | 利率（%）",
          source_file: "rules.docx",
          source_location: "table 12 row 1",
          confidence: 1,
          kind: "table"
        },
        {
          text: "短期银行融资 | 3 | 4 | 本息同还 | 10%",
          source_file: "rules.docx",
          source_location: "table 12 row 3",
          confidence: 1,
          kind: "table"
        },
        {
          text: "规则名称 | 规则值",
          source_file: "rules.docx",
          source_location: "table 15 row 1",
          confidence: 1,
          kind: "table"
        },
        {
          text: "生产线上限 | 16",
          source_file: "rules.docx",
          source_location: "table 15 row 6",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入规则文件"),
      new File(["rule text"], "rules.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    await user.click(screen.getByRole("button", { name: "参数确认" }));

    expect(await screen.findByText("初始资本")).toBeInTheDocument();
    expect(screen.getByText("780000 元")).toBeInTheDocument();
    expect(screen.getByText("R1 基础价格（元）")).toBeInTheDocument();
    expect(screen.getByText("P2 材料费")).toBeInTheDocument();
    expect(screen.getAllByText("2600 元").length).toBeGreaterThan(0);
    expect(screen.getByText("智能线 购买价格（元）")).toBeInTheDocument();
    expect(screen.getByText("短期银行融资 利率（%）")).toBeInTheDocument();
    expect(screen.getByText("生产线上限 规则值")).toBeInTheDocument();
    expect(screen.getAllByText("已确认").length).toBeGreaterThan(1);
  });

  test("uploads rule and market files from the import section", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument)
      .mockResolvedValueOnce({
        id: 1,
        filename: "rules.docx",
        document_type: "rules",
        status: "extracted",
        fragment_count: 3,
        pending_ocr_count: 0,
        fragments: []
      })
      .mockResolvedValueOnce({
        id: 2,
        filename: "market.png",
        document_type: "market",
        status: "ocr_pending",
        fragment_count: 1,
        pending_ocr_count: 1,
        fragments: []
      });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入规则文件"),
      new File(["rule text"], "rules.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["image bytes"], "market.png", { type: "image/png" })
    );

    expect(uploadDocument).toHaveBeenNthCalledWith(1, expect.any(File), "rules");
    expect(uploadDocument).toHaveBeenNthCalledWith(2, expect.any(File), "market");
    expect(await screen.findByText("规则文件：rules.docx")).toBeInTheDocument();
    expect(screen.getByText("已提取 3 个片段")).toBeInTheDocument();
    expect(screen.getByText("市场文件：market.png")).toBeInTheDocument();
    expect(screen.getByText("OCR 待确认 1 处")).toBeInTheDocument();
  });

  test("builds market analysis from uploaded fragments instead of static placeholders", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 3,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 2,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "组数 8",
          source_file: "market.xlsx",
          source_location: "sheet 参数",
          confidence: 1,
          kind: "table"
        },
        {
          text: "Y1 P2 市场容量 160 价格 40 成本 18",
          source_file: "market.xlsx",
          source_location: "sheet 市场",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));

    expect(await screen.findByText("Y1 / P2")).toBeInTheDocument();
    expect(screen.getByText("160")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("market.xlsx / sheet 市场")).toBeInTheDocument();
  });

  test("requires manual confirmation before using detected group count", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 4,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 2,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "组数 8",
          source_file: "market.xlsx",
          source_location: "sheet 参数",
          confidence: 0.96,
          kind: "table"
        },
        {
          text: "Y1 P2 市场容量 160 价格 40 成本 18",
          source_file: "market.xlsx",
          source_location: "sheet 市场",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "参数确认" }));

    expect(await screen.findByText("参赛组数")).toBeInTheDocument();
    expect(screen.getByText("market.xlsx / sheet 参数")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认 参赛组数" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "市场分析" }));
    expect(await screen.findByText("Y1 / P2")).toBeInTheDocument();
    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "参数确认" }));
    await user.click(screen.getByRole("button", { name: "确认 参赛组数" }));
    await user.click(screen.getByRole("button", { name: "市场分析" }));

    expect(screen.getByText("20")).toBeInTheDocument();
  });

  test("confirms group count directly from the market analysis page", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 5,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 2,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "组数 8",
          source_file: "market.xlsx",
          source_location: "sheet 参数",
          confidence: 0.96,
          kind: "table"
        },
        {
          text: "Y1 P2 市场容量 160 价格 40 成本 18",
          source_file: "market.xlsx",
          source_location: "sheet 市场",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));

    expect(await screen.findByRole("button", { name: "确认识别组数 8 组" })).toBeInTheDocument();
    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "确认识别组数 8 组" }));

    expect(screen.getByText("20")).toBeInTheDocument();
  });

  test("uses high-confidence detected group count without manual confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 10,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 2,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "组数 8",
          source_file: "market.xlsx",
          source_location: "sheet 参数",
          confidence: 1,
          kind: "table"
        },
        {
          text: "Y1 P2 市场容量 160 价格 40 成本 18",
          source_file: "market.xlsx",
          source_location: "sheet 市场",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));

    expect(await screen.findByText("20")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "确认识别组数 8 组" })).not.toBeInTheDocument();
  });

  test("allows manual group count confirmation when detection is missing", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument).mockResolvedValueOnce({
      id: 6,
      filename: "market.xlsx",
      document_type: "market",
      status: "extracted",
      fragment_count: 1,
      pending_ocr_count: 0,
      fragments: [
        {
          text: "Y1 P2 市场容量 160 价格 40 成本 18",
          source_file: "market.xlsx",
          source_location: "sheet 市场",
          confidence: 1,
          kind: "table"
        }
      ]
    });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));
    await user.clear(screen.getByLabelText("手动填写参赛组数"));
    await user.type(screen.getByLabelText("手动填写参赛组数"), "8");

    expect(await screen.findByText("20")).toBeInTheDocument();
  });

  test("derives market analysis from real order table rows and rule product costs", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument)
      .mockResolvedValueOnce({
        id: 7,
        filename: "rules.docx",
        document_type: "rules",
        status: "extracted",
        fragment_count: 17,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "材料名称 | 基础价格（元） | 数量 | 送货周期（季） | 账期（季）",
            source_file: "rules.docx",
            source_location: "table 4 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R1 | 800 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 2",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R2 | 800 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R4 | 1000 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 5",
            confidence: 1,
            kind: "table"
          },
          {
            text: "产品名 | 碳排放量 | 开产费用 | 产品成本 | R1 | R2 | R3 | R4",
            source_file: "rules.docx",
            source_location: "table 5 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "P2 | 0 | 0 | 5000 | 1 | 1 | 0 | 1",
            source_file: "rules.docx",
            source_location: "table 5 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "一、初始资本：780000元",
            source_file: "rules.docx",
            source_location: "paragraph 2",
            confidence: 1,
            kind: "text"
          },
          {
            text: "产品名称 | 消耗金钱（元） | 消耗时间（季）",
            source_file: "rules.docx",
            source_location: "table 6 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "P2 | 30000 | 2",
            source_file: "rules.docx",
            source_location: "table 6 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "线型名称 | 购买价格（元） | 安装周期（季） | 生产周期（季） | 产量 | 转产周期（季） | 转产价格（元）",
            source_file: "rules.docx",
            source_location: "table 8 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "智能线 | 300000 | 2 | 1 | 22 | 0 | 0",
            source_file: "rules.docx",
            source_location: "table 8 row 4",
            confidence: 1,
            kind: "table"
          },
          {
            text: "贷款名称 | 额度上限（倍） | 贷款时间（季） | 还款方式 | 利率（%）",
            source_file: "rules.docx",
            source_location: "table 12 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "长期银行融资 | 3 | 8 | 每季付息，到期还本 | 3%",
            source_file: "rules.docx",
            source_location: "table 12 row 4",
            confidence: 1,
            kind: "table"
          },
          {
            text: "费用名称 | 费用金额（元）",
            source_file: "rules.docx",
            source_location: "table 14 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "管理费用 | 4000",
            source_file: "rules.docx",
            source_location: "table 14 row 2",
            confidence: 1,
            kind: "table"
          },
          {
            text: "规则名称 | 规则值",
            source_file: "rules.docx",
            source_location: "table 15 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "生产线上限 | 16",
            source_file: "rules.docx",
            source_location: "table 15 row 6",
            confidence: 1,
            kind: "table"
          }
        ]
      })
      .mockResolvedValueOnce({
        id: 8,
        filename: "market.xlsx",
        document_type: "market",
        status: "extracted",
        fragment_count: 4,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "年份 | 季度 | 编号 | 市场 | 产品 | 特性 | 供应商参考价格(元) | 数量 | 交货期(季) | 账期(季) | 认证",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "1 | 3 | 13 | M1 | P2 | T2 | 7800 | 2500 | 4 | 1 | RZ1",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "1 | 3 | 14 | M1 | P2 | T3 | 7800 | 2500 | 4 | 4",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "2 | 1 | 26 | M1 | P2 | T1 | 7820 | 2500 | 1 | 4",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          }
        ]
      });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入规则文件"),
      new File(["rule text"], "rules.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));
    await user.clear(screen.getByLabelText("手动填写参赛组数"));
    await user.type(screen.getByLabelText("手动填写参赛组数"), "20");
    await user.click(screen.getByRole("button", { name: "确认手动组数" }));

    expect(await screen.findByText("Y1 / P2")).toBeInTheDocument();
    expect(screen.getAllByText("5000").length).toBeGreaterThan(0);
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("7800")).toBeInTheDocument();
    expect(screen.getAllByText("2600").length).toBeGreaterThan(0);
    expect(screen.getByText("5200")).toBeInTheDocument();
    expect(screen.getAllByText("67%").length).toBeGreaterThan(0);
  });

  test("shows a four-year evidence-based market plan before final operations are available", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadDocument)
      .mockResolvedValueOnce({
        id: 10,
        filename: "rules.docx",
        document_type: "rules",
        status: "extracted",
        fragment_count: 17,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "材料名称 | 基础价格（元） | 数量 | 送货周期（季） | 账期（季）",
            source_file: "rules.docx",
            source_location: "table 4 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R1 | 800 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 2",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R2 | 800 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "R4 | 1000 | 450000 | 1 | 0",
            source_file: "rules.docx",
            source_location: "table 4 row 5",
            confidence: 1,
            kind: "table"
          },
          {
            text: "产品名 | 碳排放量 | 开产费用 | 产品成本 | R1 | R2 | R3 | R4",
            source_file: "rules.docx",
            source_location: "table 5 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "P2 | 0 | 0 | 5000 | 1 | 1 | 0 | 1",
            source_file: "rules.docx",
            source_location: "table 5 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u4e00\u3001\u521d\u59cb\u8d44\u672c\uff1a780000\u5143",
            source_file: "rules.docx",
            source_location: "paragraph 2",
            confidence: 1,
            kind: "text"
          },
          {
            text: "\u4ea7\u54c1\u540d\u79f0 | \u6d88\u8017\u91d1\u94b1\uff08\u5143\uff09 | \u6d88\u8017\u65f6\u95f4\uff08\u5b63\uff09",
            source_file: "rules.docx",
            source_location: "table 6 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "P2 | 30000 | 2",
            source_file: "rules.docx",
            source_location: "table 6 row 3",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u7ebf\u578b\u540d\u79f0 | \u8d2d\u4e70\u4ef7\u683c\uff08\u5143\uff09 | \u5b89\u88c5\u5468\u671f\uff08\u5b63\uff09 | \u751f\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u4ea7\u91cf | \u8f6c\u4ea7\u5468\u671f\uff08\u5b63\uff09 | \u8f6c\u4ea7\u4ef7\u683c\uff08\u5143\uff09",
            source_file: "rules.docx",
            source_location: "table 8 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u667a\u80fd\u7ebf | 300000 | 2 | 1 | 22 | 0 | 0",
            source_file: "rules.docx",
            source_location: "table 8 row 4",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u8d37\u6b3e\u540d\u79f0 | \u989d\u5ea6\u4e0a\u9650\uff08\u500d\uff09 | \u8d37\u6b3e\u65f6\u95f4\uff08\u5b63\uff09 | \u8fd8\u6b3e\u65b9\u5f0f | \u5229\u7387\uff08%\uff09",
            source_file: "rules.docx",
            source_location: "table 12 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u957f\u671f\u94f6\u884c\u878d\u8d44 | 3 | 8 | \u6bcf\u5b63\u4ed8\u606f\uff0c\u5230\u671f\u8fd8\u672c | 3%",
            source_file: "rules.docx",
            source_location: "table 12 row 4",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u8d39\u7528\u540d\u79f0 | \u8d39\u7528\u91d1\u989d\uff08\u5143\uff09",
            source_file: "rules.docx",
            source_location: "table 14 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u7ba1\u7406\u8d39\u7528 | 4000",
            source_file: "rules.docx",
            source_location: "table 14 row 2",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u89c4\u5219\u540d\u79f0 | \u89c4\u5219\u503c",
            source_file: "rules.docx",
            source_location: "table 15 row 1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "\u751f\u4ea7\u7ebf\u4e0a\u9650 | 16",
            source_file: "rules.docx",
            source_location: "table 15 row 6",
            confidence: 1,
            kind: "table"
          }
        ]
      })
      .mockResolvedValueOnce({
        id: 11,
        filename: "market.xlsx",
        document_type: "market",
        status: "extracted",
        fragment_count: 5,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "年份 | 季度 | 编号 | 市场 | 产品 | 特性 | 供应商参考价格(元) | 数量 | 交货期(季) | 账期(季) | 认证",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "1 | 3 | 13 | M1 | P2 | T2 | 7800 | 5000 | 4 | 1 | RZ1",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "2 | 1 | 26 | M1 | P2 | T1 | 7820 | 8000 | 1 | 4",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "3 | 1 | 50 | M1 | P2 | T1 | 7900 | 9000 | 1 | 4",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          },
          {
            text: "4 | 1 | 75 | M1 | P2 | T1 | 8000 | 10000 | 1 | 4",
            source_file: "market.xlsx",
            source_location: "sheet Sheet1",
            confidence: 1,
            kind: "table"
          }
        ]
      });

    render(<App />);

    await user.upload(
      screen.getByLabelText("导入规则文件"),
      new File(["rule text"], "rules.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "市场分析" }));
    await user.type(screen.getByLabelText("手动填写参赛组数"), "20");
    await user.click(screen.getByRole("button", { name: "确认手动组数" }));
    await user.click(screen.getByRole("button", { name: "方案推演" }));

    expect(await screen.findByText("四年市场推演")).toBeInTheDocument();
    expect(screen.getAllByText("Y1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Y2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Y3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Y4").length).toBeGreaterThan(0);
    expect(screen.getByText("Y4 / P2")).toBeInTheDocument();
    expect(screen.getAllByText("2600").length).toBeGreaterThan(0);
    expect(screen.getByText("5400")).toBeInTheDocument();
    expect(screen.getByText("第一年开局方案")).toBeInTheDocument();
    expect(screen.getAllByText(/智能线/).length).toBeGreaterThan(0);
    expect(
      screen.getByText((_, element) => element?.textContent === "生产线上限：16 条")
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "融资额度：2340000 元")
    ).toBeInTheDocument();
    expect(screen.getByText("Y1-Y4 运营决策")).toBeInTheDocument();
    expect(screen.getAllByText("Y4").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/目标累计 16 条智能线/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/本年需新增 4 条/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/现金流明细表/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/仍需产线参数/)).not.toBeInTheDocument();
  });

  test("turns imported local knowledge into visible strategy methodology", async () => {
    const user = userEvent.setup();
    vi.mocked(importLocalKnowledge).mockResolvedValueOnce({
      id: 20,
      filename: "桌面逻辑知识库",
      document_type: "knowledge",
      status: "ocr_pending",
      fragment_count: 3,
      pending_ocr_count: 1,
      fragments: [
        {
          text: "关键变量 参赛组数 产品毛利 材料费 组均容量 总容量 逐季推现金流 转产周期 自动 P3 P4 研发",
          source_file: "方案推演AI.md",
          source_location: "markdown",
          confidence: 1,
          kind: "methodology"
        },
        {
          text: "视频索引待确认",
          source_file: "讲解视频.mp4",
          source_location: "video",
          confidence: 0,
          kind: "ocr_pending"
        }
      ]
    });
    vi.mocked(uploadDocument)
      .mockResolvedValueOnce({
        id: 21,
        filename: "rules.docx",
        document_type: "rules",
        status: "extracted",
        fragment_count: 6,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "一、初始资本：780000元",
            source_file: "rules.docx",
            source_location: "paragraph 1",
            confidence: 1,
            kind: "text"
          },
          {
            text: "线型名称 | 购买价格（元） | 安装周期（季） | 生产周期（季） | 产量 | 转产周期（季） | 转产价格（元）",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          },
          {
            text: "智能线 | 300000 | 2 | 1 | 22 | 0 | 0",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          },
          {
            text: "贷款名称 | 额度上限（倍） | 贷款时间（季） | 还款方式 | 利率（%）",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          },
          {
            text: "长期银行融资 | 3 | 8 | 每季付息 | 3%",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          },
          {
            text: "规则名称 | 规则值",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          },
          {
            text: "生产线上限 | 16",
            source_file: "rules.docx",
            source_location: "table",
            confidence: 1,
            kind: "table"
          }
        ]
      })
      .mockResolvedValueOnce({
        id: 22,
        filename: "market.xlsx",
        document_type: "market",
        status: "extracted",
        fragment_count: 2,
        pending_ocr_count: 0,
        fragments: [
          {
            text: "组数 20",
            source_file: "market.xlsx",
            source_location: "sheet 参数",
            confidence: 1,
            kind: "table"
          },
          {
            text: "Y1 P2 市场容量 160 价格 40 成本 18",
            source_file: "market.xlsx",
            source_location: "sheet 市场",
            confidence: 1,
            kind: "table"
          }
        ]
      });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "导入逻辑资料" }));
    expect(await screen.findByText("可用方法论证据：1 条")).toBeInTheDocument();
    expect(screen.getByText(/OCR 待确认 1 处不作最终依据/)).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText("导入规则文件"),
      new File(["rule text"], "rules.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      })
    );
    await user.upload(
      screen.getByLabelText("导入市场文件"),
      new File(["market text"], "market.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      })
    );
    await user.click(screen.getByRole("button", { name: "方案推演" }));

    expect(await screen.findByText("推演方法论依据")).toBeInTheDocument();
    expect(screen.getByText("已读取的做方案思维")).toBeInTheDocument();
    expect(screen.getByText(/产品优先级按单位毛利排序/)).toBeInTheDocument();
    expect(screen.getByText(/自动线转产不按名字一刀切/)).toBeInTheDocument();
    expect(screen.getByText("本次推演执行流程")).toBeInTheDocument();
    expect(screen.getByText(/抓取规则参数/)).toBeInTheDocument();
  });
});
