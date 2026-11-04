import io
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.routers.transcribe import get_file_extension


def test_get_file_extension():
    assert get_file_extension("audio.wav", None) == ".wav"
    assert get_file_extension("audio.WebM", None) == ".webm"
    assert get_file_extension(None, "audio/webm") == ".webm"
    assert get_file_extension(None, "audio/webm;codecs=opus") == ".webm"
    assert get_file_extension(None, "audio/mp4;codecs=mp4a.40.2") == ".m4a"
    assert get_file_extension(None, "audio/m4a") == ".m4a"
    assert get_file_extension(None, "audio/aac") == ".aac"
    assert get_file_extension(None, "audio/flac") == ".flac"
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

def test_transcribe_safari_mp4_format(client: TestClient):
    with patch("app.routers.transcribe.transcription_service.transcribe") as mock_transcribe:
        mock_transcribe.return_value = ("Audio desde Safari en MP4", 1.8)

        fake_audio_bytes = b"fake mp4 audio content"
        files = {"file": ("recording.mp4", io.BytesIO(fake_audio_bytes), "audio/mp4;codecs=mp4a.40.2")}

        res = client.post("/api/transcribe", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == "Audio desde Safari en MP4"
        assert data["duration"] == 1.8

        called_path = mock_transcribe.call_args[0][0]
        # Suffix must be .m4a based on audio/mp4 mapping
        assert str(called_path).endswith(".m4a")


def test_transcribe_thread_offload(client: TestClient):
    with patch("asyncio.to_thread") as mock_to_thread:
        mock_to_thread.return_value = ("Texto transcrito vía hilo", 2.0)

        files = {"file": ("audio.wav", io.BytesIO(b"dummy wav data"), "audio/wav")}
        res = client.post("/api/transcribe", files=files)
        assert res.status_code == 200
        assert res.json()["text"] == "Texto transcrito vía hilo"
        mock_to_thread.assert_called_once()


def test_pyav_metadata_errors_patch():
    import av
    import pytest

    # Calling av.open with metadata_errors="ignore" must not raise a TypeError
    try:
        av.open(io.BytesIO(b""), mode="r", metadata_errors="ignore")
    except TypeError as e:
        pytest.fail(f"av.open raised TypeError with metadata_errors: {e}")
    except Exception:
        # Any other audio error (like InvalidDataError on empty buffer) is expected and acceptable
        pass
