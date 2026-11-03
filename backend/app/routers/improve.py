import logging
from fastapi import APIRouter
from app.schemas import ImproveRequest, ImproveResponse
from app.services.llm import llm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/improve", tags=["Improvement"])


@router.post("", response_model=ImproveResponse)
async def improve_text(payload: ImproveRequest) -> ImproveResponse:
    """
    Refine and improve the input text according to the selected tone
    using the local LM Studio instance.
    """
    improved = await llm_service.improve_text(payload.text, payload.tone)
    return ImproveResponse(improved_text=improved, tone=payload.tone)
