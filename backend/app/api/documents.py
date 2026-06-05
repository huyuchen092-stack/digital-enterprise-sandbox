from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.schemas.documents import DocumentUploadResponse
from app.services.extraction import ExtractionService
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile,
    document_type: str = Form(default="rules"),
) -> DocumentUploadResponse:
    try:
        path = IngestionService().save_upload(file)
    except ValueError as error:
        raise HTTPException(status_code=413, detail=str(error)) from error

    filename = file.filename or path
    fragments = ExtractionService().extract(path, filename)
    pending_ocr_count = sum(1 for fragment in fragments if fragment.kind == "ocr_pending")
    if pending_ocr_count:
        status = "ocr_pending"
    elif fragments:
        status = "extracted"
    else:
        status = "unsupported"

    return DocumentUploadResponse(
        id=1,
        filename=filename,
        document_type=document_type,
        status=status,
        fragment_count=len(fragments),
        pending_ocr_count=pending_ocr_count,
        fragments=fragments,
    )
