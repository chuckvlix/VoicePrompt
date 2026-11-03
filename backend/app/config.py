from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_language: str = "es"
    lm_studio_base_url: str = "http://localhost:1234/v1"
    lm_studio_model: str = "local-model"
    sqlite_db_path: str = "voiceprompt.db"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
