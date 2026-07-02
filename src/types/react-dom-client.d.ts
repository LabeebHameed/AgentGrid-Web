/**
 * Ambient module declaration for `react-dom/client`.
 *
 * `react-dom` ships JS at `node_modules/react-dom/client.js` but the
 * accompanying `@types/react-dom` package is missing from this repo's
 * devDependencies. Rather than installing it (which would touch the
 * lockfile and require a full `npm install` round-trip), declare just
 * enough types here to satisfy tsc.
 *
 * The declaration is intentionally minimal — it covers only the
 * `createRoot` API used by main.tsx. Delete this file once
 * `@types/react-dom` is added as a devDependency.
 */
declare module "react-dom/client" {
  import type { ReactNode, Element, DocumentFragment } from "react";

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
