import type {
  AgentChatRequest,
  AgentChatResponse,
  DocumentType,
  DocumentUploadResponse,
  SimulationResult
} from "../types";

export async function fetchDemoSimulation(): Promise<SimulationResult> {
  const response = await fetch("/api/simulations/demo");
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json();
}

export async function uploadDocument(
  file: File,
  documentType: DocumentType
): Promise<DocumentUploadResponse> {
  const body = new FormData();
  body.append("document_type", documentType);
  body.append("file", file);

  const response = await fetch("/api/documents", {
    method: "POST",
    body
  });
  if (!response.ok) {
    throw new Error(`导入失败：${response.status}`);
  }
  return response.json();
}

export async function importLocalKnowledge(): Promise<DocumentUploadResponse> {
  const response = await fetch("/api/knowledge/import-local", {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`导入本地知识库失败：${response.status}`);
  }
  return response.json();
}

export async function askSandboxAgent(request: AgentChatRequest): Promise<AgentChatResponse> {
  const response = await fetch("/api/agent/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    throw new Error(`智能体请求失败：${response.status}`);
  }
  return response.json();
}
