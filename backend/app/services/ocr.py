from app.schemas.documents import ExtractedFragment


class OcrService:
    def extract_image(self, path: str, source_file: str) -> list[ExtractedFragment]:
        return [
            ExtractedFragment(
                text="",
                source_file=source_file,
                source_location="image:full",
                confidence=0.0,
                kind="ocr_pending",
            )
        ]
