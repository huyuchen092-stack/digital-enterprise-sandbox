# Digital Enterprise Sandbox

数智化企业模拟沙盘推演助手，用于导入规则、市场和本地逻辑资料，解析参数、计算市场容量和产品毛利，并生成受规则约束的第一年方案与 Y1-Y4 运营决策。

## Current Capabilities

- FastAPI backend for document upload, extraction, parameter analysis, simulation rules, and DeepSeek-compatible LLM calls.
- React/Vite frontend for importing rules, market files, and local knowledge materials.
- Reads Word, PDF, Excel, PPTX, and image metadata/OCR-pending records through the backend extraction service.
- Imports local knowledge from:
  - `C:\Users\胡宇程\Desktop\方案推演AI.md`
  - `C:\Users\胡宇程\Desktop\逻辑\`
- Computes market rows from uploaded fragments, including group average capacity and unit material-margin style profit.
- Produces a four-year operating plan with rule-bound missing-evidence checks.
- Handles automatic-line transfer decisions from rule parameters:
  - Transfer cycle greater than 0: do not transfer.
  - Transfer cycle equal to 0: transfer is allowed after capacity/order/cash-flow checks.
  - Missing transfer-cycle evidence: treated as a review-required assumption, not final evidence.

## Repository Layout

```text
backend/   FastAPI service, extraction, LLM, rule engine, tests
frontend/  React/Vite workbench, analysis calculators, tests
docs/      Rule-bound decision notes
```

## Backend Setup

```powershell
cd C:\Users\胡宇程\digital-enterprise-sandbox\backend
Copy-Item .env.example .env
```

Edit `backend\.env` and fill in your DeepSeek key:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Install dependencies if the virtual environment does not already exist:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

Run the backend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

## Frontend Setup

```powershell
cd C:\Users\胡宇程\digital-enterprise-sandbox\frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

The Vite dev server proxies `/api` and `/health` to the backend on `127.0.0.1:8000`.

## Verification

Backend:

```powershell
cd C:\Users\胡宇程\digital-enterprise-sandbox\backend
python -m pytest -q
```

Frontend:

```powershell
cd C:\Users\胡宇程\digital-enterprise-sandbox\frontend
npm test -- --run
npm run build
```

## Rule Discipline

The assistant must not drift away from the imported rules. If a required value is missing, OCR-pending, or only found in unverified video/image evidence, the plan should show it as missing or review-required instead of inventing a final answer.
