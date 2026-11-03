from unittest.mock import AsyncMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient
from app.services.llm import TONE_PROMPTS, LLMService, clean_llm_response, llm_service


@pytest.mark.parametrize("tone", ["neutral", "formal", "concise", "email", "prompt"])
def test_improve_system_prompt_structure(tone):
    prompt = llm_service.build_system_prompt(tone)
    assert "asistente de redacción experto en español" in prompt
    assert TONE_PROMPTS[tone] in prompt


def test_clean_llm_response():
    assert clean_llm_response("<think>pensando...</think> Hola mundo") == "Hola mundo"
    assert clean_llm_response("<THINK>\nMulti\nline\n</THINK>\nEstimado cliente") == "Estimado cliente"
    assert clean_llm_response("<thought>razonamiento</thought> Texto listo") == "Texto listo"
    assert clean_llm_response("```markdown\nTexto en bloque\n```") == "Texto en bloque"
    assert clean_llm_response("```\nSin lenguaje\n```") == "Sin lenguaje"
    assert clean_llm_response('"Texto entre comillas"') == "Texto entre comillas"
    assert clean_llm_response("«Texto entre comillas latinas»") == "Texto entre comillas latinas"


def test_improve_success(client: TestClient):
    mock_lm_response = {
        "id": "chatcmpl-test",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "<think>Analizando tono correo...</think> Estimado equipo, adjunto el informe correspondiente.",
                },
                "finish_reason": "stop",
            }
        ],
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json = lambda: mock_lm_response
        mock_response.raise_for_status = lambda: None
        mock_post.return_value = mock_response

        res = client.post(
            "/api/improve",
            json={"text": "mira te paso el informe para el equipo", "tone": "email"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["improved_text"] == "Estimado equipo, adjunto el informe correspondiente."
        assert data["tone"] == "email"

        # Verify LM Studio was called with expected payload
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args.kwargs
        assert call_kwargs["json"]["messages"][1]["content"] == "mira te paso el informe para el equipo"


@pytest.mark.asyncio
async def test_llm_service_auto_discovers_active_model():
    service = LLMService(base_url="http://localhost:1234/v1", model="local-model")

    mock_client = AsyncMock()
    mock_get_response = AsyncMock()
    mock_get_response.status_code = 200
    mock_get_response.json = lambda: {
        "object": "list",
        "data": [{"id": "deepseek-r1-distill-qwen-7b", "object": "model"}],
    }
    mock_client.get.return_value = mock_get_response

    discovered_model = await service.get_active_model(mock_client)
    assert discovered_model == "deepseek-r1-distill-qwen-7b"


@pytest.mark.asyncio
async def test_llm_service_preserves_custom_model():
    service = LLMService(base_url="http://localhost:1234/v1", model="custom-llama3")
    mock_client = AsyncMock()

    discovered_model = await service.get_active_model(mock_client)
    assert discovered_model == "custom-llama3"
    mock_client.get.assert_not_called()


def test_improve_empty_after_cleaning_error(client: TestClient):
    mock_lm_response = {
        "id": "chatcmpl-test",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "<think>Solo razonamiento interno sin texto final</think>",
                },
                "finish_reason": "stop",
            }
        ],
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json = lambda: mock_lm_response
        mock_response.raise_for_status = lambda: None
        mock_post.return_value = mock_response

        res = client.post(
            "/api/improve",
            json={"text": "prueba", "tone": "neutral"},
        )
        assert res.status_code == 502
        assert "respuesta vacía" in res.json()["detail"]


def test_improve_connection_error(client: TestClient):
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectError("Connection refused")

        res = client.post(
            "/api/improve",
            json={"text": "texto de prueba", "tone": "neutral"},
        )
        assert res.status_code == 503
        assert "LM Studio" in res.json()["detail"]


def test_improve_timeout_error(client: TestClient):
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ReadTimeout("Request timed out")

        res = client.post(
            "/api/improve",
            json={"text": "texto de prueba", "tone": "neutral"},
        )
        assert res.status_code == 504
        assert "tiempo límite" in res.json()["detail"]


def test_improve_validation_errors(client: TestClient):
    # Empty text
    res = client.post("/api/improve", json={"text": "", "tone": "neutral"})
    assert res.status_code == 422

    # Whitespace-only text
    res = client.post("/api/improve", json={"text": "    ", "tone": "neutral"})
    assert res.status_code == 422

    # Invalid tone
    res = client.post("/api/improve", json={"text": "hola", "tone": "invalid"})
    assert res.status_code == 422
