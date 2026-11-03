import logging
from pathlib import Path
from typing import Any
from app.config import settings

logger = logging.getLogger(__name__)


class TranscriptionService:
    def __init__(self) -> None:
        self._model: Any = None

    def get_model(self) -> Any:
        if self._model is None:
            from faster_whisper import WhisperModel

            logger.info(
                "Loading faster-whisper model '%s' (device=%s, compute_type=%s)...",
                settings.whisper_model,
                settings.whisper_device,
                settings.whisper_compute_type,
            )
            self._model = WhisperModel(
                model_size_or_path=settings.whisper_model,
                device=settings.whisper_device,
                compute_type=settings.whisper_compute_type,
            )
        return self._model

    def transcribe(
        self,
        audio_file_path: str | Path,
        language: str | None = None,
        vad_filter: bool = True,
    ) -> tuple[str, float]:
        """
        Transcribe an audio file using faster-whisper with VAD filtering.
        Returns a tuple of (transcribed_text, audio_duration_seconds).
        """
        lang = language or settings.whisper_language
        model = self.get_model()

        segments, info = model.transcribe(
            str(audio_file_path),
            language=lang,
            vad_filter=vad_filter,
        )

        segment_texts = [segment.text.strip() for segment in segments if segment.text]
        full_text = " ".join(segment_texts).strip()
        duration = float(getattr(info, "duration", 0.0) or 0.0)

        return full_text, duration


transcription_service = TranscriptionService()
