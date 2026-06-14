/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of an Aegis approval bridge on another origin (e.g. http://localhost:8787). */
  readonly VITE_AEGIS_API?: string;
  /** "1" runs the self-contained seeded demo with no backend. */
  readonly VITE_AEGIS_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
