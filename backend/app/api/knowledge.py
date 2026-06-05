from pathlib import Path

from fastapi import APIRouter

from app.schemas.documents import DocumentUploadResponse, ExtractedFragment
from app.services.extraction import ExtractionService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

SUPPORTED_SUFFIXES = {".docx", ".xlsx", ".pdf", ".pptx", ".png", ".jpg", ".jpeg", ".bmp", ".webp"}
VIDEO_SUFFIXES = {".mp4", ".mov", ".mkv", ".avi"}
METHODOLOGY_FILE = "\u65b9\u6848\u63a8\u6f14AI.md"
LOGIC_DIR = "\u903b\u8f91"
KNOWLEDGE_FILENAME = "\u684c\u9762\u903b\u8f91\u77e5\u8bc6\u5e93"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
LEARNING_REPORT = PROJECT_ROOT / "docs" / "knowledge" / "sandbox-logic-learning-report.md"


def _desktop() -> Path:
    return Path.home() / "Desktop"


def _extract_markdown(path: Path) -> ExtractedFragment | None:
    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return None
    return ExtractedFragment(
        text=text,
        source_file=str(path),
        source_location="markdown",
        confidence=1.0,
        kind="methodology",
    )


def _extract_learning_report(path: Path) -> ExtractedFragment | None:
    text = path.read_text(encoding="utf-8", errors="ignore").strip()
    if not text:
        return None
    try:
        source_file = str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        source_file = str(path)
    return ExtractedFragment(
        text=text,
        source_file=source_file,
        source_location="learned:sandbox-logic-report",
        confidence=1.0,
        kind="methodology",
    )


@router.post("/import-local", response_model=DocumentUploadResponse)
def import_local_knowledge() -> DocumentUploadResponse:
    desktop = _desktop()
    candidates = [desktop / METHODOLOGY_FILE, desktop / LOGIC_DIR]
    fragments: list[ExtractedFragment] = []
    extractor = ExtractionService()

    if LEARNING_REPORT.exists():
        fragment = _extract_learning_report(LEARNING_REPORT)
        if fragment:
            fragments.append(fragment)

    for candidate in candidates:
        if candidate.is_file() and candidate.suffix.lower() == ".md":
            fragment = _extract_markdown(candidate)
            if fragment:
                fragments.append(fragment)
            continue

        if not candidate.is_dir():
            continue

        for path in candidate.rglob("*"):
            if not path.is_file():
                continue
            suffix = path.suffix.lower()
            source_file = str(path.relative_to(desktop))
            if suffix in SUPPORTED_SUFFIXES:
                try:
                    fragments.extend(extractor.extract(str(path), source_file))
                except Exception as exc:  # noqa: BLE001
                    fragments.append(
                        ExtractedFragment(
                            text=f"extract failed: {exc}",
                            source_file=source_file,
                            source_location="extract_error",
                            confidence=0.0,
                            kind="error",
                        )
                    )
            elif suffix in VIDEO_SUFFIXES:
                fragments.append(
                    ExtractedFragment(
                        text=(
                            "video material indexed; transcript/key-frame verification "
                            f"required before using details: {path.name}"
                        ),
                        source_file=source_file,
                        source_location="video:index",
                        confidence=0.6,
                        kind="video_index",
                    )
                )

    pending_ocr_count = sum(
        1 for fragment in fragments if fragment.kind in {"ocr_pending", "video_index"}
    )
    return DocumentUploadResponse(
        id=2,
        filename=KNOWLEDGE_FILENAME,
        document_type="knowledge",
        status="ocr_pending" if pending_ocr_count else "extracted",
        fragment_count=len(fragments),
        pending_ocr_count=pending_ocr_count,
        fragments=fragments,
    )
