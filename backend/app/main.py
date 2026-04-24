import json
import logging
from pathlib import Path
from typing import Any

import httpx
from fastapi import Body, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import get_cors_origins, get_log_aiqfome_http_debug, get_magalu_client_id, get_magalu_client_secret
from app.plataforma_store import (
    parse_bearer_token,
    plataforma_get_store_path,
    plataforma_post_store_open_close,
    plataforma_request_store_path,
)

logger = logging.getLogger(__name__)

MAGALU_TOKEN_URL = "https://id.magalu.com/oauth/token"

app = FastAPI(title="aiqfome catalog store admin API", root_path="")

_origins = get_cors_origins()
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class TokenExchangeBody(BaseModel):
    code: str = Field(min_length=1)
    redirect_uri: str = Field(min_length=1)


@app.post("/api/oauth/token")
async def exchange_token(body: TokenExchangeBody) -> dict:
    client_id = get_magalu_client_id()
    client_secret = get_magalu_client_secret()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Server is not configured with MAGALU_CLIENT_ID / MAGALU_CLIENT_SECRET",
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            MAGALU_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": body.redirect_uri.strip(),
                "code": body.code.strip(),
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if resp.status_code != 200:
        detail: str | dict
        try:
            detail = resp.json()
        except json.JSONDecodeError:
            detail = resp.text[:2000] if resp.text else "token exchange failed"
        logger.warning("Magalu token exchange failed: %s %s", resp.status_code, detail)
        raise HTTPException(status_code=resp.status_code, detail=detail)

    return resp.json()


@app.post("/api/store/open")
async def store_open(authorization: str | None = Header(default=None)) -> dict:
    """POST …/store/open na plataforma — reabre a loja para pedidos."""
    token = parse_bearer_token(authorization)
    return await plataforma_post_store_open_close(token=token, action="open")


@app.post("/api/store/close")
async def store_close(authorization: str | None = Header(default=None)) -> dict:
    """POST …/store/close na plataforma — fecha a loja para novos pedidos."""
    token = parse_bearer_token(authorization)
    return await plataforma_post_store_open_close(token=token, action="close")


@app.get("/api/store/info")
async def store_info(authorization: str | None = Header(default=None)) -> dict:
    token = parse_bearer_token(authorization)
    if get_log_aiqfome_http_debug():
        logger.warning(
            "incoming GET /api/store/info Authorization header (exact bytes repr): %r",
            authorization,
        )
    return await plataforma_get_store_path(token=token, path_after_store_id="info", log_label="store_info")


@app.get("/api/store/working-hours")
async def get_working_hours(authorization: str | None = Header(default=None)) -> dict:
    token = parse_bearer_token(authorization)
    return await plataforma_get_store_path(
        token=token,
        path_after_store_id="working-hours",
        log_label="get_working_hours",
    )


@app.put("/api/store/delivery-time")
async def put_delivery_time(
    authorization: str | None = Header(default=None),
    body: dict[str, Any] = Body(...),
) -> dict:
    """PUT /store/{id}/delivery-time — ver guia Horários de Serviço."""
    token = parse_bearer_token(authorization)
    return await plataforma_request_store_path(
        token=token,
        method="PUT",
        path_after_store_id="delivery-time",
        json_body=body,
        log_label="put_delivery_time",
    )


@app.put("/api/store/preparation-time")
async def put_preparation_time(
    authorization: str | None = Header(default=None),
    body: dict[str, Any] = Body(...),
) -> dict:
    """PUT /store/{id}/preparation-time — tempo de preparo (múltiplo de 10)."""
    token = parse_bearer_token(authorization)
    return await plataforma_request_store_path(
        token=token,
        method="PUT",
        path_after_store_id="preparation-time",
        json_body=body,
        log_label="put_preparation_time",
    )


@app.post("/api/store/working-hours")
async def post_working_hours(
    authorization: str | None = Header(default=None),
    body: Any = Body(...),
) -> dict:
    """POST /store/{id}/working-hours — substitui dias enviados no payload."""
    token = parse_bearer_token(authorization)
    return await plataforma_request_store_path(
        token=token,
        method="POST",
        path_after_store_id="working-hours",
        json_body=body,
        log_label="post_working_hours",
    )


@app.get("/api/store/delivery-costs")
async def get_delivery_costs(authorization: str | None = Header(default=None)) -> dict:
    """GET /store/{id}/delivery-costs — custos de entrega (incl. frete por raio)."""
    token = parse_bearer_token(authorization)
    return await plataforma_get_store_path(
        token=token,
        path_after_store_id="delivery-costs",
        log_label="get_delivery_costs",
    )


@app.post("/api/store/delivery-costs/radius")
async def post_delivery_costs_radius(
    authorization: str | None = Header(default=None),
    body: Any = Body(...),
) -> dict:
    """POST /store/{id}/delivery-costs/radius — criar faixa(s) de frete por raio (Create store delivery cost)."""
    token = parse_bearer_token(authorization)
    return await plataforma_request_store_path(
        token=token,
        method="POST",
        path_after_store_id="delivery-costs/radius",
        json_body=body,
        log_label="post_delivery_costs_radius",
    )


@app.put("/api/store/delivery-costs/radius")
async def put_delivery_costs_radius(
    authorization: str | None = Header(default=None),
    body: Any = Body(...),
) -> dict:
    """PUT /store/{id}/delivery-costs/radius — atualizar frete por raio (Update store delivery cost)."""
    token = parse_bearer_token(authorization)
    return await plataforma_request_store_path(
        token=token,
        method="PUT",
        path_after_store_id="delivery-costs/radius",
        json_body=body,
        log_label="put_delivery_costs_radius",
    )


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


_static_root = Path(__file__).resolve().parent.parent / "static"
if _static_root.is_dir():
    app.mount("/", StaticFiles(directory=_static_root, html=True), name="spa")
