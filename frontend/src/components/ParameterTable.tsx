import type { ParameterCandidate } from "../types";

type Props = {
  parameters: ParameterCandidate[];
  onConfirm: (key: string) => void;
  onReject: (key: string) => void;
};

const statusLabels: Record<ParameterCandidate["status"], string> = {
  candidate: "候选参数",
  requires_confirmation: "需人工确认",
  confirmed: "已确认",
  conflict: "存在冲突",
  rejected: "已驳回"
};

export function ParameterTable({ parameters, onConfirm, onReject }: Props) {
  return (
    <section className="panel parameter-panel" aria-labelledby="parameter-table-title">
      <h3 id="parameter-table-title">参数确认</h3>
      <table>
        <thead>
          <tr>
            <th>参数</th>
            <th>识别值</th>
            <th>来源</th>
            <th>置信度</th>
            <th>影响范围</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((parameter) => (
            <tr
              key={parameter.key}
              className={parameter.status === "requires_confirmation" ? "warn" : ""}
            >
              <td>{parameter.label}</td>
              <td>
                {parameter.value}
                {parameter.unit ? ` ${parameter.unit}` : ""}
              </td>
              <td>
                {parameter.source_file} / {parameter.source_location}
              </td>
              <td>{Math.round(parameter.confidence * 100)}%</td>
              <td>{parameter.impact}</td>
              <td>
                <span
                  className={
                    parameter.status === "requires_confirmation"
                      ? "status-label status-label-warning"
                      : "status-label"
                  }
                  aria-label={
                    parameter.status === "requires_confirmation"
                      ? "需人工确认，不可用于最终推演"
                      : statusLabels[parameter.status]
                  }
                >
                  <span>{statusLabels[parameter.status]}</span>
                  {parameter.status === "requires_confirmation" && (
                    <small>不可用于最终推演</small>
                  )}
                </span>
              </td>
              <td>
                {parameter.status === "confirmed" || parameter.status === "rejected" ? (
                  <span className="muted-action">已处理</span>
                ) : (
                  <div className="row-actions">
                    <button
                      className="action-button confirm-button"
                      type="button"
                      onClick={() => onConfirm(parameter.key)}
                      aria-label={`确认 ${parameter.label}`}
                    >
                      确认
                    </button>
                    <button
                      className="action-button reject-button"
                      type="button"
                      onClick={() => onReject(parameter.key)}
                      aria-label={`驳回 ${parameter.label}`}
                    >
                      驳回
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
