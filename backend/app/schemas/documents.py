from pydantic import BaseModel, Field


class ExtractedFragment(BaseModel):
    text: str
    source_file: str
    source_location: str
    confidence: float = Field(ge=0, le=1)
    kind: str = "text"


class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    document_type: str = "rules"
    status: str
    fragment_count: int = 0
    pending_ocr_count: int = 0
    fragments: list[ExtractedFragment] = Field(default_factory=list)
