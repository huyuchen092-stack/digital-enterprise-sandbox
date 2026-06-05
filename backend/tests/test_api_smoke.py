from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_market_demo_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/simulations/demo")

    assert response.status_code == 200
    data = response.json()
    assert data["rule_bound"] is True
    assert "y1_quarters" in data


def test_parameters_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/parameters")

    assert response.status_code == 200
    assert response.json() == []


def test_document_upload_endpoint(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            data={"document_type": "rules"},
            files={"file": ("rules.txt", b"small upload", "text/plain")},
        )

    assert response.status_code == 200
    assert response.json()["filename"] == "rules.txt"
    assert response.json()["document_type"] == "rules"
    assert response.json()["status"] == "unsupported"
    assert response.json()["fragment_count"] == 0


def test_document_upload_endpoint_extracts_pending_ocr_for_market_image(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            data={"document_type": "market"},
            files={"file": ("market.png", b"fake image bytes", "image/png")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "market.png"
    assert data["document_type"] == "market"
    assert data["status"] == "ocr_pending"
    assert data["fragment_count"] == 1
    assert data["pending_ocr_count"] == 1
    assert data["fragments"][0]["kind"] == "ocr_pending"


def test_document_upload_endpoint_rejects_oversized_upload(monkeypatch, tmp_path):
    from app.services import ingestion

    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(ingestion, "MAX_UPLOAD_BYTES", 4)

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            files={"file": ("large.txt", b"too large", "text/plain")},
        )

    assert response.status_code == 413
    assert response.json() == {"detail": "upload exceeds maximum size"}
    assert list(tmp_path.iterdir()) == []


def test_document_upload_endpoint_returns_all_extracted_fragments(monkeypatch, tmp_path):
    from app.api import documents
    from app.schemas.documents import ExtractedFragment

    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))

    class FakeExtractionService:
        def extract(self, path, filename):
            return [
                ExtractedFragment(
                    text=f"row {index}",
                    source_file=filename,
                    source_location="sheet Sheet1",
                    confidence=1,
                    kind="table",
                )
                for index in range(25)
            ]

    monkeypatch.setattr(documents, "ExtractionService", FakeExtractionService)

    with TestClient(app) as client:
        response = client.post(
            "/api/documents",
            data={"document_type": "market"},
            files={"file": ("market.xlsx", b"fake xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["fragment_count"] == 25
    assert len(data["fragments"]) == 25
    assert data["fragments"][-1]["text"] == "row 24"


def test_import_local_knowledge_includes_learned_strategy_report(monkeypatch, tmp_path):
    from app.api import knowledge

    report = tmp_path / "sandbox-logic-learning-report.md"
    report.write_text(
        "# 沙盘逻辑资料学习记录\n\n## 算法化推演模型 v2\n\n先算组均容量，再算材料口径毛利。",
        encoding="utf-8",
    )
    empty_desktop = tmp_path / "Desktop"
    empty_desktop.mkdir()

    monkeypatch.setattr(knowledge, "LEARNING_REPORT", report)
    monkeypatch.setattr(knowledge, "_desktop", lambda: empty_desktop)

    with TestClient(app) as client:
        response = client.post("/api/knowledge/import-local")

    assert response.status_code == 200
    data = response.json()
    assert data["fragment_count"] == 1
    assert data["pending_ocr_count"] == 0
    assert data["fragments"][0]["kind"] == "methodology"
    assert data["fragments"][0]["source_location"] == "learned:sandbox-logic-report"
    assert "算法化推演模型 v2" in data["fragments"][0]["text"]
