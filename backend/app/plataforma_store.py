"""Resolução da loja vinculada ao token e chamadas à API V2 na plataforma."""

import json
import logging
import shlex
from typing import Any

import httpx
from fastapi import HTTPException

from app.config import (
    get_aiqfome_http_user_agent,
    get_aiqfome_httpx_trust_env,
    get_aiqfome_v2_api_root,
    get_log_aiqfome_http_debug,
)

logger = logging.getLogger(__name__)


def parse_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip().strip('"').strip("'")
    token = "".join(token.split())
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token")
    return token


def store_rows_from_list_payload(list_payload: dict) -> list[dict]:
    raw = list_payload.get("data")
    if isinstance(raw, list):
        return [s for s in raw if isinstance(s, dict)]
    if isinstance(raw, dict):
        return [raw]
    return []


def http_error_detail(resp: httpx.Response) -> str | dict:
    try:
        return resp.json()
    except json.JSONDecodeError:
        return resp.text[:2000] if resp.text else resp.reason_phrase


def store_id_path_segment(store_id: object) -> str:
    if store_id is None or isinstance(store_id, bool):
        raise HTTPException(status_code=502, detail="Invalid store id type")
    if isinstance(store_id, float) and store_id.is_integer():
        return str(int(store_id))
    if isinstance(store_id, int):
        return str(store_id)
    s = str(store_id).strip()
    if not s:
        raise HTTPException(status_code=502, detail="Invalid store id")
    return s


def plataforma_request_headers(bearer_token: str, *, json_body: bool = False) -> dict[str, str]:
    h: dict[str, str] = {
        "Authorization": f"Bearer {bearer_token}",
        "Accept": "application/json",
    }
    if json_body:
        h["Content-Type"] = "application/json"
    ua = get_aiqfome_http_user_agent()
    if ua:
        h["User-Agent"] = ua
    return h


def log_outbound_request(*, label: str, method: str, url: str, headers: dict[str, str]) -> None:
    if not get_log_aiqfome_http_debug():
        return
    parts: list[str] = ["curl", "-sS", "-X", method, shlex.quote(url)]
    for key, value in headers.items():
        parts.append("-H")
        parts.append(shlex.quote(f"{key}: {value}"))
    logger.warning("aiqfome outbound [%s] equivalent curl:\n%s", label, " ".join(parts))


def store_subresource_url(root: str, store_id: str, *segments: str) -> str:
    """Ex.: root + /store/12/working-hours"""
    tail = "/".join(segments)
    return f"{root}/store/{store_id}/{tail}"


async def resolve_first_store_id(client: httpx.AsyncClient, token: str) -> tuple[str, str, dict]:
    root = get_aiqfome_v2_api_root()
    list_url = f"{root}/store"
    headers = plataforma_request_headers(token)
    log_outbound_request(label="list_store", method="GET", url=list_url, headers=headers)

    list_resp = await client.get(list_url, headers=headers)
    if list_resp.status_code != 200:
        detail = http_error_detail(list_resp)
        logger.warning("aiqfome list store failed: status=%s detail=%s", list_resp.status_code, detail)
        raise HTTPException(status_code=list_resp.status_code, detail=detail)

    try:
        list_payload = list_resp.json()
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail="Invalid JSON from aiqfome list store") from e

    if not isinstance(list_payload, dict):
        raise HTTPException(status_code=502, detail="List store response root must be a JSON object")

    stores = store_rows_from_list_payload(list_payload)
    if not stores:
        raise HTTPException(status_code=404, detail="No store in list payload (data empty or unexpected shape)")

    store_id = stores[0].get("id")
    if store_id is None:
        raise HTTPException(status_code=502, detail="First store row missing id")

    return root, store_id_path_segment(store_id), stores[0]


# Campos da listagem GET /store usados no painel (estado operacional prevalece sobre GET …/info).
_STORE_LIST_STATUS_KEYS = (
    "status",
    "store_status",
    "open",
    "is_open",
    "is_online",
    "online",
    "accepting_orders",
    "shop_open",
    "store_open",
    "is_closed",
    "closed",
    "paused",
    "standby",
)


def _merge_list_store_row_into_info_payload(info_payload: dict, list_first_row: dict) -> dict:
    """Sobrepõe em `data` os campos vindos de GET /store (fonte de verdade para aberta/fechada na listagem)."""
    data = info_payload.get("data")
    if not isinstance(data, dict) or not isinstance(list_first_row, dict):
        return info_payload
    for k in _STORE_LIST_STATUS_KEYS:
        if k in list_first_row:
            data[k] = list_first_row[k]
    return info_payload


async def plataforma_get_store_path(
    *,
    token: str,
    path_after_store_id: str,
    log_label: str,
) -> dict:
    """path_after_store_id ex.: 'working-hours' ou 'info'."""
    path_after_store_id = path_after_store_id.strip("/")
    async with httpx.AsyncClient(timeout=60.0, trust_env=get_aiqfome_httpx_trust_env()) as client:
        root, sid, list_first = await resolve_first_store_id(client, token)
        url = store_subresource_url(root, sid, path_after_store_id)
        headers = plataforma_request_headers(token)
        log_outbound_request(label=log_label, method="GET", url=url, headers=headers)
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            detail = http_error_detail(resp)
            logger.warning("aiqfome %s failed: status=%s detail=%s", log_label, resp.status_code, detail)
            raise HTTPException(status_code=resp.status_code, detail=detail)
        try:
            out = resp.json()
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=502, detail="Invalid JSON from aiqfome") from e
        out = out if isinstance(out, dict) else {"data": out}
        if path_after_store_id == "info":
            out = _merge_list_store_row_into_info_payload(out, list_first)
        return out


async def plataforma_request_store_path(
    *,
    token: str,
    method: str,
    path_after_store_id: str,
    json_body: Any,
    log_label: str,
) -> dict:
    path_after_store_id = path_after_store_id.strip("/")
    async with httpx.AsyncClient(timeout=60.0, trust_env=get_aiqfome_httpx_trust_env()) as client:
        root, sid, _list_first = await resolve_first_store_id(client, token)
        url = store_subresource_url(root, sid, path_after_store_id)
        headers = plataforma_request_headers(token, json_body=json_body is not None)
        log_outbound_request(label=log_label, method=method, url=url, headers=headers)
        resp = await client.request(method, url, headers=headers, json=json_body)
        if resp.status_code not in (200, 201, 202, 204):
            detail = http_error_detail(resp)
            logger.warning("aiqfome %s failed: status=%s detail=%s", log_label, resp.status_code, detail)
            raise HTTPException(status_code=resp.status_code, detail=detail)
        if resp.status_code == 204 or not (resp.content or b"").strip():
            return {}
        try:
            out = resp.json()
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=502, detail="Invalid JSON from aiqfome") from e
        return out if isinstance(out, dict) else {"data": out}


async def plataforma_post_store_open_close(*, token: str, action: str) -> dict:
    """
    POST /api/v2/store/open ou …/close — abre ou fecha a loja para pedidos na plataforma.
    Ver documentação: Open store / Close store (scope aqf:store:create).
    """
    act = action.strip().lower()
    if act not in ("open", "close"):
        raise HTTPException(status_code=400, detail='action must be "open" or "close"')

    async with httpx.AsyncClient(timeout=60.0, trust_env=get_aiqfome_httpx_trust_env()) as client:
        root, sid, _first = await resolve_first_store_id(client, token)
        url = f"{root.rstrip('/')}/store/{act}"
        headers = plataforma_request_headers(token, json_body=True)
        # A plataforma exige store_id no corpo (ex.: {"store_id": 138302}).
        store_id_payload: int | str = int(sid) if sid.isdigit() else sid
        body = {"store_id": store_id_payload}
        log_outbound_request(label=f"post_store_{act}", method="POST", url=url, headers=headers)
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code not in (200, 201, 202, 204):
            detail = http_error_detail(resp)
            logger.warning("aiqfome post_store_%s failed: status=%s detail=%s", act, resp.status_code, detail)
            raise HTTPException(status_code=resp.status_code, detail=detail)
        if resp.status_code == 204 or not (resp.content or b"").strip():
            return {}
        try:
            out = resp.json()
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=502, detail="Invalid JSON from aiqfome") from e
        return out if isinstance(out, dict) else {"data": out}
