export type ParameterStatus =
  | "candidate"
  | "requires_confirmation"
  | "confirmed"
  | "conflict"
  | "rejected";

export type ParameterCandidate = {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  source_file: string;
  source_location: string;
  confidence: number;
  impact: string;
  critical: boolean;
  status: ParameterStatus;
};

export type QuarterAction = {
  quarter: string;
  actions: string[];
  cash_checks: string[];
};

export type SimulationResult = {
  rule_bound: boolean;
  total_y1_capacity: number;
  expected_gross_profit: number;
  y1_quarters: QuarterAction[];
  y2_y4_strategy: string[];
  risk_checks: string[];
};

export type ExtractedFragment = {
  text: string;
  source_file: string;
  source_location: string;
  confidence: number;
  kind: string;
};

export type DocumentType = "rules" | "market" | "knowledge";

export type DocumentUploadResponse = {
  id: number;
  filename: string;
  document_type: DocumentType;
  status: "uploaded" | "extracted" | "ocr_pending" | "unsupported";
  fragment_count: number;
  pending_ocr_count: number;
  fragments: ExtractedFragment[];
};

export type AgentTask =
  | "first_year_plan"
  | "market_analysis"
  | "four_year_strategy"
  | "product_analysis"
  | "line_analysis"
  | "advertising_strategy"
  | "cashflow_check"
  | "line_replacement"
  | "general_question";

export type AgentChatRequest = {
  question: string;
  project_id?: number | null;
  fragments?: ExtractedFragment[];
  parameters?: ParameterCandidate[];
  market_rows?: Array<Record<string, unknown>>;
  rule_summary?: Record<string, unknown>;
};

export type AgentChatResponse = {
  task: AgentTask;
  answer: string;
  model: string;
  warnings: string[];
  context_summary: string[];
};
