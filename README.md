# Admin catálogo (lojistas)

Monorepo com **frontend** (Vite + React + [`@aiqfome-org/geraldo-ui`](https://www.npmjs.com/package/@aiqfome-org/geraldo-ui)) e **backend** (FastAPI + httpx) para uso na **Loja de Apps do Geraldo**, autenticando via Magalu ID e consultando a **API V2** do aiqfome ([dados da loja](https://developer.aiqfome.com/docs/guides/v2/stores/store-management/info)).

## Desenvolvimento local

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencha MAGALU_* e CORS_ORIGINS
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Endpoints:

- `POST /api/oauth/token` — troca `code` + `redirect_uri` por tokens no [Magalu](https://developer.aiqfome.com/docs/guides/get-started/step-2)
- `GET /api/store/info` — `Authorization: Bearer`; resolve a loja e chama `GET …/store/{id}/info`
- `GET /api/store/working-hours` — [consulta horários](https://developer.aiqfome.com/docs/guides/v2/stores/store-delivery/working-time)
- `PUT /api/store/delivery-time` — body JSON `{ "delivery_time": "40 - 60" }` (valores permitidos na doc)
- `POST /api/store/working-hours` — body conforme POST da doc (substitui dias enviados)
- `GET /api/store/delivery-costs` — GET …/store/{id}/delivery-costs (custos de entrega por raio)
- `POST /api/store/delivery-costs/radius` — criar faixas sem `id` no body ([Create store delivery cost](https://developer.aiqfome.com/docs/api/v2/create-store-delivery-cost))
- `PUT /api/store/delivery-costs/radius` — atualizar faixas existentes: cada item inclui `id` ([Update store delivery cost](https://developer.aiqfome.com/docs/api/v2/update-store-delivery-cost))
- `PUT /api/store/preparation-time` — body JSON `{ "preparation_time": 30 }` (múltiplo de 10)
- `POST /api/store/open` / `POST /api/store/close` — abrir/fechar loja (body com `store_id`)
- `GET /api/health` — health check

Escritas na API aiqfome exigem escopo **`aqf:store:create`** (o pedido de login do front inclui `aqf:store:read` e `aqf:store:create`).

### Frontend

```bash
cd frontend
cp .env.example .env   # VITE_MAGALU_CLIENT_ID, VITE_POSTMESSAGE_ORIGINS, VITE_API_BASE_URL (vazio = mesmo host / proxy)
npm install
npm run dev
```

O Vite faz proxy de `/api` para `http://127.0.0.1:8000` ([`vite.config.ts`](frontend/vite.config.ts)).

## Variáveis de ambiente

| Onde | Variável | Uso |
|------|-----------|-----|
| Backend | `MAGALU_CLIENT_ID`, `MAGALU_CLIENT_SECRET` | Troca do OAuth code no `id.magalu.com` |
| Backend | `AIQFOME_API_BASE_URL` | Host da plataforma (`https://plataforma.aiqfome.com`); o backend chama `GET {host}/api/v2/store` e `GET {host}/api/v2/store/{id}/info` ([referência](https://developer.aiqfome.com/docs/api/v2/list-stores)) |
| Backend | `AIQFOME_API_V2_PREFIX` | Opcional; omissão `/api/v2` |
| Backend | `AIQFOME_API_V2_ROOT` | Opcional; se definido, substitui `BASE`+`PREFIX` (ex.: URL de homologação completa) |
| Backend | `AIQFOME_HTTP_TRUST_ENV` | `true` só se precisares de proxy de sistema para a plataforma; por omissão o httpx **não** usa `HTTP(S)_PROXY` (diferença comum vs Postman) |
| Backend | `AIQFOME_HTTP_USER_AGENT` | Opcional; omissão envia User-Agent estilo browser; `none` usa o default do httpx |
| Backend | `LOG_AIQFOME_HTTP_DEBUG` | `0`/`false` desliga; por omissão **liga** log com `curl` equivalente (URL + headers com **token**). Desliga em produção. |
| Backend | `CORS_ORIGINS` | Lista CSV (Geraldo + URL do app + `http://localhost:5173`) |
| Frontend | `VITE_API_BASE_URL` | Base da API do teu backend; vazio = mesma origem |
| Frontend | `VITE_MAGALU_CLIENT_ID` | Client ID do app (portal desenvolvedor) |
| Frontend | `VITE_POSTMESSAGE_ORIGINS` | CSV para `parseAllowedOrigins` (Geraldo + localhost) |

O `redirect_uri` enviado ao Magalu vem do SDK (`auth.redirectUri`); deve coincidir com o cadastrado no portal.

## Railway (dois serviços, Docker por app)

Há um **`Dockerfile` em `backend/`** (só API) e outro em **`frontend/`** (build Vite + nginx com SPA). O FastAPI **não** inclui `static/` nesta imagem; se a pasta existir no disco (ex. deploy manual), o SPA continua opcional em [`main.py`](backend/app/main.py).

### Serviço 1 — API

1. Novo serviço **Docker** a partir do mesmo repositório.
2. **Root Directory**: `backend` (no painel Railway: Settings → Root Directory).
3. O ficheiro `Dockerfile` é lido de `backend/Dockerfile` por omissão quando o root é `backend`.
4. Variáveis de runtime: `MAGALU_CLIENT_ID`, `MAGALU_CLIENT_SECRET`, `AIQFOME_API_BASE_URL`, `CORS_ORIGINS`, etc. (ver tabela acima).
5. Em **`CORS_ORIGINS`**, inclui a **URL pública do serviço do frontend** (ex. `https://web-production-xxx.up.railway.app`) e `https://geraldo-restaurantes.aiqfome.com`.

### Serviço 2 — Web (SPA)

1. Novo serviço **Docker**, mesmo repositório.
2. **Root Directory**: `frontend`.
3. **Build arguments** (ou variáveis disponíveis no build no Railway) para o `npm run build`:
   - `VITE_MAGALU_CLIENT_ID` — obrigatório.
   - `VITE_POSTMESSAGE_ORIGINS` — CSV (Geraldo + origem do frontend em produção).
   - **`VITE_API_BASE_URL`** — URL **absoluta** do serviço 1 (ex. `https://api-production-yyy.up.railway.app`), **sem** barra final; o browser chama a API noutro domínio.
4. O contentor nginx usa a variável de ambiente **`PORT`** (Railway injeta); o script [`frontend/docker/entrypoint.sh`](frontend/docker/entrypoint.sh) gera o `server` com `try_files` para o SPA.

### Build local das imagens

```bash
# API (contexto = pasta backend)
docker build -t catalog-api ./backend

# Web (contexto = pasta frontend; ajusta os ARG conforme o ambiente)
docker build -t catalog-web ./frontend \
  --build-arg VITE_API_BASE_URL=http://127.0.0.1:8000 \
  --build-arg VITE_MAGALU_CLIENT_ID=... \
  --build-arg VITE_POSTMESSAGE_ORIGINS=http://127.0.0.1:5173
```

### Root directory no Railway (sem Docker)

Se usares Nixpacks só em `backend`, o SPA não é construído; para o painel web usa o serviço com **`frontend/Dockerfile`** ou um host estático equivalente.

## Licença

Uso interno / conforme política do projeto.
