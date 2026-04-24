import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@lru_cache
def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip()]


def get_magalu_client_id() -> str:
    return os.getenv("MAGALU_CLIENT_ID", "")


def get_magalu_client_secret() -> str:
    return os.getenv("MAGALU_CLIENT_SECRET", "")


def get_aiqfome_api_base() -> str:
    """Host da plataforma (sem path de versão)."""
    return os.getenv("AIQFOME_API_BASE_URL", "https://plataforma.aiqfome.com").rstrip("/")


def get_aiqfome_v2_api_root() -> str:
    """
    Raiz da API V2. Por omissão: {AIQFOME_API_BASE_URL}/api/v2
    (List stores: GET /api/v2/store — ver referência em developer.aiqfome.com).
    """
    override = os.getenv("AIQFOME_API_V2_ROOT", "").strip()
    if override:
        return override.rstrip("/")
    base = get_aiqfome_api_base()
    prefix = os.getenv("AIQFOME_API_V2_PREFIX", "/api/v2").strip() or "/api/v2"
    if not prefix.startswith("/"):
        prefix = "/" + prefix
    return f"{base}{prefix.rstrip('/')}"


def get_aiqfome_httpx_trust_env() -> bool:
    """Por omissão False: ignora HTTP(S)_PROXY do sistema (muitas vezes Postman funciona e Python não)."""
    return os.getenv("AIQFOME_HTTP_TRUST_ENV", "").strip().lower() in ("1", "true", "yes")


def get_aiqfome_http_user_agent() -> str | None:
    """
    Alguns WAFs bloqueiam o User-Agent default do httpx (python-httpx/…).
    Omissão: User-Agent estilo browser; vazio em AIQFOME_HTTP_USER_AGENT desativa o override.
    """
    raw = os.getenv("AIQFOME_HTTP_USER_AGENT", "").strip()
    if raw == "":
        return (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    if raw.lower() in ("none", "0", "-"):
        return None
    return raw


def get_log_aiqfome_http_debug() -> bool:
    """Log de pedidos à plataforma (inclui token). Omissão: ligado; produção: LOG_AIQFOME_HTTP_DEBUG=0."""
    return os.getenv("LOG_AIQFOME_HTTP_DEBUG", "1").strip().lower() not in ("0", "false", "no", "off")
