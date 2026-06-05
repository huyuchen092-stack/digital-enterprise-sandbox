from app.services.extraction import ExtractionService
from app.services.ocr import OcrService


def test_ocr_extract_image_returns_pending_fragment() -> None:
    fragments = OcrService().extract_image("scan.png", "scan.png")

    assert len(fragments) == 1
    fragment = fragments[0]
    assert fragment.kind == "ocr_pending"
    assert fragment.text == ""
    assert fragment.confidence == 0.0
    assert fragment.source_location == "image:full"


def test_extraction_dispatches_image_to_pending_ocr_fragment() -> None:
    fragments = ExtractionService().extract("scan.png", "scan.png")

    assert len(fragments) == 1
    fragment = fragments[0]
    assert fragment.kind == "ocr_pending"
    assert fragment.text == ""
    assert fragment.confidence == 0.0
    assert fragment.source_location == "image:full"


def test_extraction_returns_empty_for_unsupported_suffix() -> None:
    fragments = ExtractionService().extract("notes.txt", "notes.txt")

    assert fragments == []
