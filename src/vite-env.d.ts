/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Aegis approval bridge (e.g. http://localhost:8787). */
  readonly VITE_AEGIS_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
