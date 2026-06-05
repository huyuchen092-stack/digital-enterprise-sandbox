from fastapi import APIRouter

from app.schemas.parameters import ParameterCandidate

router = APIRouter(prefix="/api/parameters", tags=["parameters"])


@router.get("", response_model=list[ParameterCandidate])
def list_parameters() -> list[ParameterCandidate]:
    return []
