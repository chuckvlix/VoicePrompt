import logging
import os
import tempfile
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.schemas import TranscriptionResponse
from app.services.transcription import transcription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcribe", tags=["Transcription"])


def get_file_extension(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return f".{filename.rsplit('.', 1)[-1].lower()}"
    if content_type:
        type_map = {
            "audio/webm": ".webm",
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mp3": ".mp3",
            "audio/mpeg": ".mp3",
            "audio/ogg": ".ogg",
            "audio/flac": ".flac",
            "audio/mp4": ".m4a",
            "audio/m4a": ".m4a",
            "video/webm": ".webm",
        }
        for mime, ext in type_map.items():
            if mime in content_type:
                return ext
    return ".webm"


@router.post("", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)) -> TranscriptionResponse:
    """
    Accept an uploaded audio blob, save temporarily, run faster-whisper (Spanish, VAD enabled),
    and return the transcribed text and audio duration.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No se proporcionó ningún archivo de audio.")

    ext = get_file_extension(file.filename, file.content_type)
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    temp_path = Path(temp_file.name)

    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400,
                detail="El archivo de audio recibido está vacío.",
            )

        with open(temp_path, "wb") as f:
            f.write(content)

        text, duration = transcription_service.transcribe(temp_path)
        return TranscriptionResponse(text=text, duration=duration)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing audio transcription: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Error durante el procesamiento del audio: {exc}",
        ) from exc
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except OSError:
                logger.warning("Could not delete temporary audio file: %s", temp_path)
