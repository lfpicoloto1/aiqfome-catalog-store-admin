const TOKEN_KEY = "aiqfome_catalog_admin_access_token";

export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getStoredAccessToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Mensagem mostrada após 401; também usada no `App` quando a sessão é limpa. */
export const SESSION_EXPIRED_MESSAGE = "Sessão expirada ou token inválido. Entre novamente com o Magalu ID.";

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | undefined;

/** Regista callback para quando a API devolver 401 (token inválido/expirado). Devolve função para cancelar. */
export function registerSessionExpiredHandler(handler: SessionExpiredHandler | undefined): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = undefined;
  };
}

function triggerSessionExpired(): void {
  clearStoredAccessToken();
  try {
    sessionExpiredHandler?.();
  } catch {
    /* evita quebrar o fluxo de fetch */
  }
}

function isUnauthorized(res: Response): boolean {
  return res.status === 401;
}

export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/oauth/token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (body as { detail?: unknown }).detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail != null
          ? JSON.stringify(detail)
          : res.statusText;
    throw new Error(message || `Token exchange failed (${res.status})`);
  }
  return body;
}

async function parseError(res: Response, fallback: string): Promise<never> {
  if (isUnauthorized(res)) {
    triggerSessionExpired();
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }
  const body = await res.json().catch(() => ({}));
  const detail = (body as { detail?: unknown }).detail;
  const message =
    typeof detail === "string"
      ? detail
      : detail != null
        ? JSON.stringify(detail)
        : res.statusText;
  throw new Error(message || fallback);
}

export async function fetchStoreInfo(accessToken: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/info"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) await parseError(res, `Store info failed (${res.status})`);
  return res.json();
}

/** Lista a grade semanal atual (GET working-hours). */
export async function getStoreWeekSchedule(accessToken: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/working-hours"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) await parseError(res, `Não foi possível carregar os horários (${res.status}).`);
  return res.json();
}

/** Custos de entrega da loja (GET …/store/{id}/delivery-costs). */
export async function getStoreDeliveryCosts(accessToken: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/delivery-costs"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) await parseError(res, `Não foi possível carregar os custos de entrega (${res.status}).`);
  return res.json();
}

/** Cria faixa(s) de frete por raio sem `id` (POST …/delivery-costs/radius — Create store delivery cost). */
export async function createStoreDeliveryCostsRadius(
  accessToken: string,
  payload: { radius: object[] },
): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/delivery-costs/radius"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, `Não foi possível criar o frete por raio (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Atualiza faixas existentes — cada item precisa de `id` (PUT …/delivery-costs/radius — Update store delivery cost). */
export async function updateStoreDeliveryCostsRadius(
  accessToken: string,
  payload: { radius: object[] },
): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/delivery-costs/radius"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, `Não foi possível atualizar o frete por raio (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Atualiza só o intervalo de entrega exibido ao cliente (PUT delivery-time). */
export async function updateDeliveryWindow(accessToken: string, payload: { delivery_time: string }): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/delivery-time"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, `Não foi possível atualizar o prazo de entrega (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Tempo de preparo em minutos (múltiplo de 10) — PUT …/store/{id}/preparation-time. */
export async function updateStorePreparationTime(
  accessToken: string,
  payload: { preparation_time: number },
): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/preparation-time"), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, `Não foi possível salvar o tempo de preparo (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Substitui os dias enviados na grade (POST working-hours). */
export async function updateStoreHoursByDay(accessToken: string, payload: object): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/working-hours"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, `Não foi possível salvar os horários por dia (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Reabre a loja para pedidos (POST …/store/open na plataforma). Requer aqf:store:create. */
export async function openStoreForOrders(accessToken: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/open"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) await parseError(res, `Não foi possível abrir a loja (${res.status}).`);
  return res.json().catch(() => ({}));
}

/** Fecha a loja para novos pedidos (POST …/store/close na plataforma). Requer aqf:store:create. */
export async function closeStoreForOrders(accessToken: string): Promise<unknown> {
  const res = await fetch(apiUrl("/api/store/close"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) await parseError(res, `Não foi possível fechar a loja (${res.status}).`);
  return res.json().catch(() => ({}));
}
