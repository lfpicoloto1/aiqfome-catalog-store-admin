/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MAGALU_CLIENT_ID: string;
  readonly VITE_POSTMESSAGE_ORIGINS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
