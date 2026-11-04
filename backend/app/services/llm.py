import logging
import re
import httpx
from fastapi import HTTPException
from app.config import settings
from app.schemas import ToneType

logger = logging.getLogger(__name__)

TONE_PROMPTS: dict[ToneType, str] = {
    "neutral": (
        "Mejora la redacción en español corrigiendo ortografía, gramática, fluidez y claridad. "
        "Mantén un tono natural, directo, equilibrado y profesional."
    ),
    "formal": (
        "Reescribe el texto en un español formal, diplomático y pulido. "
        "Utiliza vocabulario preciso y estructuras sintácticas elegantes adecuadas para un contexto corporativo o institucional."
    ),
    "concise": (
        "Sintetiza el texto eliminando redundancias, rodeos y palabras de relleno. "
        "Transmite el mensaje esencial con la máxima claridad, economía de palabras y contundencia en español."
    ),
    "email": (
        "Estructura el texto como un correo electrónico profesional en español. "
        "Incluye una primera línea con el asunto ('Asunto: ...'), saludo cordial adecuado, cuerpo del mensaje en párrafos limpios y legibles, y despedida profesional con espacio para firma."
    ),
    "prompt": (
        "Convierte la idea en un prompt optimizado y de alta ingeniería para un modelo de lenguaje (LLM). "
        "Estructúralo claramente en español definiendo el Rol/Contexto, la Tarea específica, Reglas/Restricciones y Formato de salida requerido."
    ),
}

BASE_SYSTEM_INSTRUCTION = (
    "Eres un asistente de redacción experto en español. Tu función es transformar y refinar el texto dictado o escrito por el usuario según las pautas de estilo solicitadas.\n"
    "REGLAS CRÍTICAS:\n"
    "1. Devuelve EXCLUSIVAMENTE el texto final resultante.\n"
    "2. NO agregues introducciones, preámbulos, confirmaciones ni despedidas (NUNCA digas frases como 'Aquí tienes tu texto mejorado:', 'Por supuesto', o 'Espero que esto ayude').\n"
    "3. No encierres la totalidad de tu respuesta entre comillas a menos que sea una cita solicitada."
)


def clean_llm_response(text: str) -> str:
    """
    Sanitize and clean raw LLM output:
    - Strip <think>...</think> and <thought>...</thought> reasoning blocks.
    - Strip wrapping markdown code fences if present.
    - Strip enclosing quotation marks.
    """
    # Remove thinking tags from reasoning models
    text = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<thought>[\s\S]*?</thought>", "", text, flags=re.IGNORECASE)
    text = text.strip()

    # Strip full markdown code fences (e.g. ```markdown ... ``` or ```text ... ```)
    match = re.match(r"^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```$", text)
    if match:
        text = match.group(1).strip()

    # Strip enclosing quotation marks if wrapped completely
    if (text.startswith('"') and text.endswith('"')) or (text.startswith('«') and text.endswith('»')):
        text = text[1:-1].strip()

    return text


class LLMService:
    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        self.base_url = (base_url or settings.lm_studio_base_url).rstrip("/")
        self.model = model or settings.lm_studio_model

    def build_system_prompt(self, tone: ToneType) -> str:
        tone_instruction = TONE_PROMPTS.get(tone, TONE_PROMPTS["neutral"])
        return f"{BASE_SYSTEM_INSTRUCTION}\n\nInstrucción de estilo ({tone}):\n{tone_instruction}"

    async def get_active_model(self, client: httpx.AsyncClient) -> str:
        """
        Dynamically discover the active loaded model in LM Studio if the default placeholder is used.
        """
        if self.model and self.model != "local-model":
            return self.model
        try:
            res = await client.get(f"{self.base_url}/models", timeout=3.0)
            if res.status_code == 200:
                data = res.json()
                models = data.get("data", [])
                if models and isinstance(models, list) and len(models) > 0:
                    model_id = models[0].get("id")
                    if model_id:
                        return str(model_id)
        except Exception as exc:
            logger.debug("Could not auto-discover active model from LM Studio /models: %s", exc)
        return self.model or "local-model"

    async def improve_text(self, text: str, tone: ToneType) -> str:
        """
        Call LM Studio local inference server /chat/completions to improve the given text.
        """
        endpoint = f"{self.base_url}/chat/completions"
        system_content = self.build_system_prompt(tone)

        try:
            async with httpx.AsyncClient(timeout=settings.lm_studio_timeout) as client:
                model_to_use = await self.get_active_model(client)

                is_reasoning_model = any(
                    tag in model_to_use.lower()
                    for tag in ["qwen3", "qwen-3", "qwq", "r1", "deepseek-r1", "reasoning", "thinking"]
                )

                messages: list[dict[str, str]] = [
                    {"role": "system", "content": system_content},
                    {"role": "user", "content": text},
                ]

                # For reasoning models (e.g. Qwen 3.5, QwQ, DeepSeek-R1), prefill thinking closure
                # to prevent 60-120s reasoning loops on local hardware
                if is_reasoning_model:
                    messages.append({"role": "assistant", "content": "<think>\n</think>"})

                payload = {
                    "model": model_to_use,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1500,
                    "stream": False,
                }

                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()

            choices = data.get("choices", [])
            if not choices:
                raise HTTPException(
                    status_code=502,
                    detail="LM Studio no devolvió ninguna opción de respuesta válida.",
                )

            message_obj = choices[0].get("message", {})
            raw_text = message_obj.get("content", "").strip()
            if not raw_text and message_obj.get("reasoning_content"):
                raw_text = message_obj.get("reasoning_content", "").strip()

            improved_text = clean_llm_response(raw_text)

            if not improved_text:
                raise HTTPException(
                    status_code=502,
                    detail="LM Studio devolvió una respuesta vacía tras procesar el texto.",
                )

            return improved_text

        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            logger.error("Could not connect to LM Studio at %s: %s", endpoint, exc)
            raise HTTPException(
                status_code=503,
                detail=(
                    f"No se pudo conectar con el servidor local de LM Studio en {self.base_url}. "
                    "Verifica que LM Studio esté abierto, el servidor local iniciado en el puerto 1234 y un modelo cargado en memoria."
                ),
            ) from exc
        except httpx.ReadTimeout as exc:
            logger.error("LM Studio request timed out: %s", exc)
            raise HTTPException(
                status_code=504,
                detail="La solicitud a LM Studio excedió el tiempo límite de espera (timeout).",
            ) from exc
        except httpx.HTTPStatusError as exc:
            logger.error("LM Studio returned HTTP %s: %s", exc.response.status_code, exc.response.text)
            raise HTTPException(
                status_code=502,
                detail=f"LM Studio respondió con error {exc.response.status_code}: {exc.response.text}",
            ) from exc
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Unexpected error communicating with LM Studio: %s", exc)
            raise HTTPException(
                status_code=500,
                detail=f"Error inesperado al comunicarse con el modelo de lenguaje: {exc}",
            ) from exc


llm_service = LLMService()
