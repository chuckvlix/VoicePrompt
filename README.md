# VoicePrompt 🎙️✨

**VoicePrompt** es una aplicación web local para dictado por voz en español y refinamiento estilístico mediante inteligencia artificial local.

- **Speech-to-Text**: Utiliza `faster-whisper` (`small` model con `language="es"` y `vad_filter=True`) para transcribir voz a texto con alta precisión y sin alucinaciones de silencio.
- **Refinamiento de estilo (LLM)**: Conexión directa con **LM Studio** local (`http://localhost:1234/v1`) para reescribir y optimizar el texto según el tono seleccionado:
  - **Estándar**: Natural, fluido y con ortografía perfecta.
  - **Formal**: Corporativo, diplomático y con sintaxis académica.
  - **Conciso**: Síntesis directa al grano sin redundancias.
  - **Correo**: Estructura completa de email con asunto, saludo y despedida.
  - **Prompt IA**: Ingeniería de prompts estructurados (Rol, Tarea, Restricciones, Formato).
- **Persistencia**: Base de datos SQLite local para almacenar bajo demanda las versiones original y mejorada.

---

## Arquitectura

```mermaid
flowchart LR
    Mic["Micrófono (MediaRecorder)"] -->|Audio WebM/WAV| API_STT["POST /api/transcribe (FastAPI)"]
    API_STT -->|faster-whisper (es, vad=True)| DraftUI["Editor Original"]
    DraftUI -->|Texto + Tono| API_LLM["POST /api/improve (FastAPI)"]
    API_LLM -->|POST /chat/completions| LMStudio["LM Studio Local (1234)"]
    LMStudio -->|Texto Refinado| ImprovedUI["Editor Mejorado"]
    ImprovedUI -->|Guardar en Historial| API_DB["POST /api/history"]
    API_DB -->|Persistencia| SQLite[("SQLite (voiceprompt.db)")]
```

---

## Requisitos previos

1. **Python 3.12** y **uv** instalados.
2. **Bun** instalado.
3. **LM Studio** con un modelo cargado y el servidor local iniciado en el puerto `1234`.

---

## Puesta en marcha

### 1. Iniciar Backend (FastAPI)

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

El backend se iniciará en `http://localhost:8000`. Puedes verificar su estado en `http://localhost:8000/api/health` o consultar la documentación OpenAPI en `http://localhost:8000/docs`.

### 2. Iniciar Frontend (Vite + React + TS)

```bash
cd frontend
bun install
bun run dev
```

Abre `http://localhost:5173` en tu navegador.

---

## Pruebas automatizadas

### Backend (`pytest`):
```bash
cd backend
uv run pytest
```

### Frontend (`bun`):
```bash
cd frontend
bun run build
```
