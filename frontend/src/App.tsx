import { createGeraldoMagaluAuth, parseAllowedOrigins } from "@aiqfome-org/geraldo-ui/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SESSION_EXPIRED_MESSAGE,
  clearStoredAccessToken,
  closeStoreForOrders,
  exchangeOAuthCode,
  fetchStoreInfo,
  getStoredAccessToken,
  openStoreForOrders,
  registerSessionExpiredHandler,
  setStoredAccessToken,
} from "./api.ts";
import { ActionButton } from "./components/ActionButton.tsx";
import { FeedbackStrip } from "./components/FeedbackStrip.tsx";
import { OpenSwitch } from "./components/OpenSwitch.tsx";
import { PrivacyPage } from "./pages/PrivacyPage.tsx";
import { TermsPage } from "./pages/TermsPage.tsx";
import { WorkingHoursSection } from "./WorkingHoursSection.tsx";
import { useAppPath } from "./useAppPath.ts";

type VirtualAvatar = Record<string, string>;

type StoreInfoData = {
  id?: number;
  name?: string;
  corporate_name?: string;
  document_number?: string;
  time_to_prepare_order?: number;
  time_to_deliver?: string;
  is_delivery_radius_active?: boolean;
  virtual_avatar?: VirtualAvatar | null;
  city_id?: number;
  commission?: string;
  /** Se a loja aceita pedidos agora na plataforma (null se a resposta não trouxer o campo). */
  storeFrontOpen: boolean | null;
};

function pickAvatarUrl(avatar: VirtualAvatar | null | undefined): string | null {
  if (!avatar || typeof avatar !== "object") return null;
  const keys = ["default", "300", "160", "132", "500"] as const;
  for (const k of keys) {
    const u = avatar[k];
    if (typeof u === "string" && u.length > 0) return u;
  }
  const first = Object.values(avatar).find((v) => typeof v === "string" && v.length > 0);
  return first ?? null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function interpretOpenLike(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return null;
}

/** Interpreta `status` / `store_status` típicos de GET /store (plataforma aiqfome). */
function interpretStatusField(v: unknown): boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["open", "opened", "online", "active", "available", "1", "true", "ativo", "aberta", "aberto"].includes(s)) {
      return true;
    }
    if (
      ["closed", "close", "offline", "inactive", "0", "false", "inativo", "fechada", "fechado", "paused"].includes(s)
    ) {
      return false;
    }
    return null;
  }
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
    return null;
  }
  return null;
}

/** Estado “aberta para pedidos” a partir do resumo (GET /info + merge com GET /store). */
function pickStoreFrontOpen(data: Record<string, unknown>): boolean | null {
  const fromStatus = interpretStatusField(data["status"]);
  if (fromStatus !== null) return fromStatus;
  const fromStoreStatus = interpretStatusField(data["store_status"]);
  if (fromStoreStatus !== null) return fromStoreStatus;

  const paused = data["paused"] ?? data["standby"];
  if (paused === true || paused === 1 || paused === "1") return false;

  const closed = data["closed"] ?? data["is_closed"];
  if (typeof closed === "boolean") return !closed;
  if (closed === 1 || closed === "1") return false;
  if (closed === 0 || closed === "0") return true;

  const keys = ["is_open", "open", "is_online", "online", "accepting_orders", "shop_open", "store_open"] as const;
  for (const key of keys) {
    const o = interpretOpenLike(data[key]);
    if (o !== null) return o;
  }
  return null;
}

function parseStorePayload(payload: unknown): StoreInfoData | null {
  if (!isRecord(payload)) return null;
  const data = payload.data;
  if (!isRecord(data)) return null;
  return {
    ...(data as Omit<StoreInfoData, "storeFrontOpen">),
    storeFrontOpen: pickStoreFrontOpen(data),
  };
}

type GeraldoAuth = ReturnType<typeof createGeraldoMagaluAuth>;

export function App() {
  const { path, navigate } = useAppPath();
  const clientId = (import.meta.env.VITE_MAGALU_CLIENT_ID ?? "").trim();
  const originsCsv = import.meta.env.VITE_POSTMESSAGE_ORIGINS ?? "";
  const allowedOrigins = useMemo(() => parseAllowedOrigins(originsCsv), [originsCsv]);
  const authRef = useRef<GeraldoAuth | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());
  const [authBusy, setAuthBusy] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [store, setStore] = useState<StoreInfoData | null>(null);
  const [storeToggleBusy, setStoreToggleBusy] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState<string | null>(null);

  useEffect(() => {
    return registerSessionExpiredHandler(() => {
      setAccessToken(null);
      setStore(null);
      setStoreSuccess(null);
      setError(SESSION_EXPIRED_MESSAGE);
    });
  }, []);

  const loadStore = useCallback(async (token: string, opts?: { announceOk?: boolean }) => {
    setStoreBusy(true);
    setError(null);
    if (!opts?.announceOk) setStoreSuccess(null);
    try {
      const json = await fetchStoreInfo(token);
      setStore(parseStorePayload(json));
      if (opts?.announceOk) setStoreSuccess("Resumo da loja atualizado com sucesso.");
    } catch (e) {
      setStore(null);
      setStoreSuccess(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStoreBusy(false);
    }
  }, []);

  const onStoreFrontToggle = useCallback(
    async (nextOpen: boolean) => {
      if (!accessToken) return;
      setStoreToggleBusy(true);
      setError(null);
      setStoreSuccess(null);
      try {
        if (nextOpen) await openStoreForOrders(accessToken);
        else await closeStoreForOrders(accessToken);
        await loadStore(accessToken);
        setStoreSuccess(
          nextOpen ? "Loja aberta para pedidos. Alterações salvas com sucesso." : "Loja fechada para novos pedidos. Alterações salvas com sucesso.",
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setStoreToggleBusy(false);
      }
    },
    [accessToken, loadStore],
  );

  useEffect(() => {
    if (accessToken) void loadStore(accessToken);
  }, [accessToken, loadStore]);

  useEffect(() => {
    const auth = createGeraldoMagaluAuth({
      clientId,
      scopes: ["aqf:store:read", "aqf:store:create"],
      allowedOrigins,
      onMessage(msg) {
        if (msg.kind !== "authCode") return;
        void (async () => {
          setAuthBusy(true);
          setError(null);
          try {
            const tokens = (await exchangeOAuthCode(msg.code, auth.redirectUri)) as {
              access_token?: string;
            };
            const at = tokens.access_token;
            if (!at) throw new Error("Resposta sem access_token");
            setStoredAccessToken(at);
            setAccessToken(at);
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setAuthBusy(false);
          }
        })();
      },
    });
    authRef.current = auth;

    return () => {
      auth.dispose();
      authRef.current = null;
    };
  }, [allowedOrigins, clientId]);

  const openLogin = () => {
    setError(null);
    const auth = authRef.current;
    if (!auth) {
      setError("Auth não inicializado");
      return;
    }
    const result = auth.openLogin() as { ok: boolean; reason?: string };
    if (!result.ok && result.reason === "popup_blocked") {
      setError("Popup bloqueado. Permita popups para este site.");
    } else if (!result.ok && result.reason === "missing_client_id") {
      setError("Configure VITE_MAGALU_CLIENT_ID");
    }
  };

  const logout = () => {
    clearStoredAccessToken();
    setAccessToken(null);
    setStore(null);
    setError(null);
    setStoreSuccess(null);
  };

  const avatarUrl = pickAvatarUrl(store?.virtual_avatar ?? undefined);

  if (path === "/termos") {
    return <TermsPage navigate={navigate} />;
  }
  if (path === "/privacidade") {
    return <PrivacyPage navigate={navigate} />;
  }

  return (
    <div className="layout-root">
      <header className="app-header">
        <div className="app-header__brand">
          <geraldo-text variant="h2-page" weight="medium" as="h1">
            Painel da loja
          </geraldo-text>
          <geraldo-text variant="caption" as="p">
            Aiqfome · Magalu ID
          </geraldo-text>
        </div>
        <div className="app-header__actions">
          {!accessToken ? (
            <ActionButton variant="filled" color="primary" size="lg" loading={authBusy} onClick={openLogin}>
              Entrar com Magalu ID
            </ActionButton>
          ) : (
            <>
              <geraldo-badge tone="success">Sessão ativa</geraldo-badge>
              <ActionButton
                variant="filled"
                color="primary"
                loading={storeBusy}
                disabled={storeBusy}
                onClick={() => void loadStore(accessToken, { announceOk: true })}
              >
                Atualizar resumo
              </ActionButton>
              <ActionButton variant="ghost" color="primary" onClick={logout}>
                Sair
              </ActionButton>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {error ? (
          <FeedbackStrip tone="danger" onDismiss={() => setError(null)}>
            {error}
          </FeedbackStrip>
        ) : null}

        {storeSuccess && !error ? (
          <FeedbackStrip tone="success" onDismiss={() => setStoreSuccess(null)}>
            {storeSuccess}
          </FeedbackStrip>
        ) : null}

        {!accessToken ? (
          <geraldo-card radius="outer" elevation="mid" className="welcome-card">
            <geraldo-text slot="header" variant="h3-section" weight="medium" as="h2">
              Bem-vindo
            </geraldo-text>
            <div className="welcome-body">
              <geraldo-text variant="body-default" as="p">
                Aqui você acompanha e ajusta informações da sua loja na aiqfome depois de entrar com o seu{" "}
                <strong>Magalu ID</strong>.
              </geraldo-text>
              <geraldo-text variant="body-default" as="p">
                Se ainda não vinculou a loja ao Magalu ID, assista ao vídeo abaixo com o passo a passo antes de
                iniciar sessão.
              </geraldo-text>
              <div className="welcome-video-wrap">
                <iframe
                  className="welcome-video-iframe"
                  src="https://www.youtube.com/embed/2oKjjhet1KI"
                  title="Como vincular a loja ao Magalu ID"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <p className="welcome-video-caption">
                <a
                  className="inline-link"
                  href="https://www.youtube.com/watch?v=2oKjjhet1KI"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir este vídeo no YouTube
                </a>
              </p>
              <nav className="welcome-legal" aria-label="Documentos legais">
                <button type="button" className="app-footer__link" onClick={() => navigate("/termos")}>
                  Termos de uso
                </button>
                <span className="app-footer__sep" aria-hidden>
                  ·
                </span>
                <button type="button" className="app-footer__link" onClick={() => navigate("/privacidade")}>
                  Política de privacidade
                </button>
              </nav>
            </div>
            <div slot="footer" className="card-footer-actions card-footer-actions--end">
              <ActionButton variant="filled" color="primary" size="lg" loading={authBusy} onClick={openLogin}>
                Iniciar sessão
              </ActionButton>
            </div>
          </geraldo-card>
        ) : null}

        {accessToken && storeBusy && !store ? (
          <geraldo-card radius="outer" elevation="low" className="skeleton-card">
            <geraldo-text variant="body-default" as="p">
              Carregando dados da loja…
            </geraldo-text>
          </geraldo-card>
        ) : null}

        {accessToken && store ? (
          <div className="dashboard">
            <section
              className={`store-hero-panel store-hero${storeBusy ? " store-hero--refreshing" : ""}`}
              aria-label="Resumo da loja"
            >
              <div className="store-hero__body">
                <div className="store-hero__layout">
                  <div className="store-hero__avatar-wrap">
                    {avatarUrl ? (
                      <img className="store-hero__avatar" src={avatarUrl} alt="" />
                    ) : (
                      <div className="store-hero__avatar store-hero__avatar--placeholder" aria-hidden>
                        <geraldo-text variant="h3-section" weight="medium" as="span">
                          {(store.name ?? "?").slice(0, 1).toUpperCase()}
                        </geraldo-text>
                      </div>
                    )}
                  </div>
                  <div className="store-hero__content">
                    <geraldo-text variant="h3-section" weight="medium" as="h2">
                      {store.name ?? "—"}
                    </geraldo-text>
                    <geraldo-text variant="body-default" as="p">
                      {store.corporate_name ?? "—"}
                    </geraldo-text>
                    <div className="stat-chips" role="list">
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          CNPJ
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.document_number ?? "—"}
                        </geraldo-text>
                      </div>
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          ID loja
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.id ?? "—"}
                        </geraldo-text>
                      </div>
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          Cidade (ID)
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.city_id ?? "—"}
                        </geraldo-text>
                      </div>
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          Preparo
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.time_to_prepare_order != null ? `${store.time_to_prepare_order} min` : "—"}
                        </geraldo-text>
                      </div>
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          Entrega
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.time_to_deliver ?? "—"}
                        </geraldo-text>
                      </div>
                      <div className="stat-chip" role="listitem">
                        <geraldo-text variant="caption" as="span">
                          Comissão
                        </geraldo-text>
                        <geraldo-text variant="body-strong" as="span">
                          {store.commission != null ? `${store.commission}%` : "—"}
                        </geraldo-text>
                      </div>
                    </div>
                    <div className="store-hero__badges">
                      <geraldo-badge tone={store.is_delivery_radius_active ? "info" : "neutral"}>
                        Raio de entrega: {store.is_delivery_radius_active ? "ativo" : "inativo"}
                      </geraldo-badge>
                      {store.storeFrontOpen !== null ? (
                        <geraldo-badge tone={store.storeFrontOpen ? "success" : "neutral"}>
                          Pedidos na plataforma: {store.storeFrontOpen ? "aberta" : "fechada"}
                        </geraldo-badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="store-hero__orders store-hero__orders--card-body">
                  <div className="store-hero__orders-text">
                    <geraldo-text variant="body-default" weight="medium" as="p" className="store-hero__orders-title">
                      Receber pedidos agora
                    </geraldo-text>
                    <geraldo-text variant="caption" as="p" className="store-hero__orders-caption">
                      {store.storeFrontOpen === null
                        ? "A plataforma não enviou o estado na última sincronização. O interruptor abaixo chama abrir ou fechar loja (API V2)."
                        : store.storeFrontOpen
                          ? "Sua loja está aberta para novos pedidos na aiqfome."
                          : "Sua loja está fechada para novos pedidos na aiqfome."}
                    </geraldo-text>
                    {storeToggleBusy ? (
                      <geraldo-text variant="caption" as="p" className="store-hero__orders-loading">
                        Aplicando na plataforma…
                      </geraldo-text>
                    ) : null}
                  </div>
                  <div className="store-hero__orders-switch">
                    <OpenSwitch
                      checked={store.storeFrontOpen === true}
                      disabled={storeToggleBusy || storeBusy}
                      onChecked={onStoreFrontToggle}
                    />
                  </div>
                </div>
              </div>
              <div className="card-footer-meta store-hero-panel__footer">
                <geraldo-text variant="caption" as="span">
                  Dados resumidos da sua loja.
                </geraldo-text>
              </div>
            </section>

            <WorkingHoursSection
              accessToken={accessToken}
              initialPreparationMinutes={store.time_to_prepare_order}
              initialDeliveryWindow={store.time_to_deliver}
              onDeliverySettingsSaved={() => {
                if (accessToken) void loadStore(accessToken);
              }}
            />
          </div>
        ) : null}
      </main>

      <footer className="app-footer">
        <nav className="app-footer__legal" aria-label="Documentos legais">
          <button type="button" className="app-footer__link" onClick={() => navigate("/termos")}>
            Termos de uso
          </button>
          <span className="app-footer__sep" aria-hidden>
            ·
          </span>
          <button type="button" className="app-footer__link" onClick={() => navigate("/privacidade")}>
            Política de privacidade
          </button>
        </nav>
        <geraldo-text variant="caption" as="p">
          Geraldo UI · aiqfome
        </geraldo-text>
      </footer>
    </div>
  );
}
