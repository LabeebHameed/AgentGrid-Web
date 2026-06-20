/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of an Agent Grid approval bridge on another origin (e.g. http://localhost:8787). */
  readonly VITE_AGENTGRID_API?: string;
  /** "1" runs the self-contained seeded demo with no backend. */
  readonly VITE_AGENTGRID_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
