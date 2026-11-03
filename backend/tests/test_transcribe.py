import io
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.routers.transcribe import get_file_extension


def test_get_file_extension():
    assert get_file_extension("audio.wav", None) == ".wav"
    assert get_file_extension("audio.WebM", None) == ".webm"
    assert get_file_extension(None, "audio/webm") == ".webm"
    assert get_file_extension(None, "audio/wav") == ".wav"
    assert get_file_extension(None, "audio/mp3") == ".mp3"
    assert get_file_extension(None, "audio/ogg") == ".ogg"
    assert get_file_extension(None, "application/octet-stream") == ".webm"


def test_transcribe_endpoint_success(client: TestClient):
    with patch("app.routers.transcribe.transcription_service.transcribe") as mock_transcribe:
        mock_transcribe.return_value = ("Hola esto es una prueba de transcripción", 3.45)

        fake_audio_bytes = b"fake audio content byte stream"
        files = {"file": ("recording.webm", io.BytesIO(fake_audio_bytes), "audio/webm")}

        res = client.post("/api/transcribe", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == "Hola esto es una prueba de transcripción"
        assert data["duration"] == 3.45

        # Check mock was called with a path
        mock_transcribe.assert_called_once()
        called_path = mock_transcribe.call_args[0][0]
        assert isinstance(called_path, Path)
        # Note: the file should have been cleaned up after the request
        assert not called_path.exists()


def test_transcribe_empty_file_error(client: TestClient):
    files = {"file": ("empty.wav", io.BytesIO(b""), "audio/wav")}
    res = client.post("/api/transcribe", files=files)
    assert res.status_code == 400
    assert "vacío" in res.json()["detail"]


def test_transcribe_exception_cleanup(client: TestClient):
    with patch("app.routers.transcribe.transcription_service.transcribe") as mock_transcribe:
        mock_transcribe.side_effect = RuntimeError("Failed model processing")

        files = {"file": ("error.webm", io.BytesIO(b"some audio bytes"), "audio/webm")}
        res = client.post("/api/transcribe", files=files)
        assert res.status_code == 500
        assert "Error durante el procesamiento" in res.json()["detail"]

        called_path = mock_transcribe.call_args[0][0]
        # Verify file cleaned up despite exception
        assert not called_path.exists()
