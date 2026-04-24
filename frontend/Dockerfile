# Build Vite + nginx estático (SPA). Deploy no Railway com root directory = `frontend`.
FROM node:22-alpine AS build
WORKDIR /web

ARG VITE_API_BASE_URL=
ARG VITE_MAGALU_CLIENT_ID=
ARG VITE_POSTMESSAGE_ORIGINS=https://geraldo-restaurantes.aiqfome.com

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MAGALU_CLIENT_ID=${VITE_MAGALU_CLIENT_ID}
ENV VITE_POSTMESSAGE_ORIGINS=${VITE_POSTMESSAGE_ORIGINS}

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /web/dist /usr/share/nginx/html
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
