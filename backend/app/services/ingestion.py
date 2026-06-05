from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


MAX_UPLOAD_BYTES = 50 * 1024 * 1024


class IngestionService:
    def save_upload(self, upload: UploadFile) -> str:
        upload_dir = Path(settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(upload.filename or "upload.bin").suffix
        target = upload_dir / f"{uuid4().hex}{suffix}"
        with target.open("wb") as handle:
            total_bytes = 0
            while chunk := upload.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    handle.close()
                    target.unlink(missing_ok=True)
                    raise ValueError("upload exceeds maximum size")
                handle.write(chunk)
        return str(target)
