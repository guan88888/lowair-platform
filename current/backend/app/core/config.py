import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _as_bool(value: str) -> bool:
    return value.lower() in {"1", "true", "yes", "on"}


class Settings:
    APP_NAME = os.getenv("APP_NAME", "天穹智航 API")
    DEBUG = _as_bool(os.getenv("DEBUG", "true"))
    # Development data is opt-in for production and only runs against the
    # configured MySQL engine.  Tests using an injected SQLite session remain
    # isolated from the seed registry.
    SEED_DEMO_DATA = _as_bool(os.getenv("SEED_DEMO_DATA", "true"))
    API_V1_PREFIX = "/api/v1"

    MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "my_app_dkjj")

    SECRET_KEY = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    RESET_CODE_EXPIRE_MINUTES = int(os.getenv("RESET_CODE_EXPIRE_MINUTES", "10"))
    AUTH_RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_LIMIT_WINDOW_SECONDS", "900"))
    AUTH_RATE_LIMIT_MAX_ATTEMPTS = int(os.getenv("AUTH_RATE_LIMIT_MAX_ATTEMPTS", "8"))
    # Keep explicit origins configurable, while allowing HBuilder/Vite to use
    # any local development port without turning on broad cross-origin access.
    CORS_ORIGINS = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",") if item.strip()]
    CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")

    # Local storage is deliberately private: files are served through the API
    # after ownership checks instead of exposing a writable static directory.
    UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
    UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(25 * 1024 * 1024)))
    UPLOAD_STORAGE_BACKEND = os.getenv("UPLOAD_STORAGE_BACKEND", "local")
    OBJECT_STORAGE_ENDPOINT = os.getenv("OBJECT_STORAGE_ENDPOINT", "")
    OBJECT_STORAGE_BUCKET = os.getenv("OBJECT_STORAGE_BUCKET", "")
    PAYMENT_WEBHOOK_SECRET = os.getenv("PAYMENT_WEBHOOK_SECRET", "")
    # The provider value can be either an OpenAI-compatible base URL or the
    # complete /chat/completions endpoint. Credentials are process-only
    # environment variables and must never be returned by an API response.
    MODEL_PROVIDER_URL = os.getenv("MODEL_PROVIDER_URL", "")
    MODEL_PROVIDER_API_KEY = os.getenv("MODEL_PROVIDER_API_KEY", "")
    MODEL_PROVIDER_MODEL = os.getenv("MODEL_PROVIDER_MODEL", "deepseek-v4-flash")
    MODEL_PROVIDER_TIMEOUT_SECONDS = float(os.getenv("MODEL_PROVIDER_TIMEOUT_SECONDS", "35"))
    MODEL_PROVIDER_MAX_TOKENS = int(os.getenv("MODEL_PROVIDER_MAX_TOKENS", "1200"))
    AMAP_WEB_SERVICE_KEY = os.getenv("AMAP_WEB_SERVICE_KEY", "")
    AMAP_TIMEOUT_SECONDS = float(os.getenv("AMAP_TIMEOUT_SECONDS", "8"))

    @property
    def database_url(self) -> str:
        user = quote_plus(self.MYSQL_USER)
        password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+pymysql://{user}:REDACTED_SECRET@{self.MYSQL_HOST}:"
            f"{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"
        )


settings = Settings()
