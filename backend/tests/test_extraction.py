from pathlib import Path

import openpyxl

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


def test_xlsx_extraction_keeps_formula_fragments(tmp_path: Path) -> None:
    workbook_path = tmp_path / "budget.xlsx"
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = "第一年"
    worksheet["A1"] = "收入"
    worksheet["B1"] = 100
    worksheet["C1"] = "=B1-25"
    workbook.save(workbook_path)

    fragments = ExtractionService().extract(str(workbook_path), "budget.xlsx")

    assert any(fragment.kind == "table" and "收入" in fragment.text for fragment in fragments)
    formula_fragments = [fragment for fragment in fragments if fragment.kind == "formula"]
    assert len(formula_fragments) == 1
    assert formula_fragments[0].text.startswith("C1 =B1-25")
    assert formula_fragments[0].source_location == "sheet 第一年 cell C1"
