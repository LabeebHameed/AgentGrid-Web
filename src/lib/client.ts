import { HttpApi, SeedApi, type ApprovalApi } from "./api";

/**
 * Resolve the backend base URL the same way the previous console did: an
 * explicit `?api=` / `?port=` query param wins and is cached, otherwise fall
 * back to whatever was cached before, otherwise `VITE_AGENTGRID_API`.
 */
const resolveApiBase = (): string => {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const apiParam = url.searchParams.get("api");
  if (apiParam !== null && apiParam !== "") {
    const clean = apiParam.replace(/\/+$/, "");
    window.localStorage.setItem("agentgrid_api_base", clean);
    url.searchParams.delete("api");
    window.history.replaceState({}, "", url.toString());
    return clean;
  }
  const portParam = url.searchParams.get("port");
  if (portParam !== null && portParam !== "") {
    const base = `http://localhost:${portParam}`;
    window.localStorage.setItem("agentgrid_api_base", base);
    url.searchParams.delete("port");
    window.history.replaceState({}, "", url.toString());
    return base;
  }
  const cached = window.localStorage.getItem("agentgrid_api_base");
  if (cached !== null && cached !== "") return cached.replace(/\/+$/, "");
  return ((import.meta.env.VITE_AGENTGRID_API as string | undefined) ?? "").replace(/\/+$/, "");
};

const isDemoMode = (): boolean =>
  (import.meta.env.VITE_AGENTGRID_DEMO as string | undefined) === "1";

/**
 * Demo mode (SeedApi, no real backend) is meant to run fully offline, so it
 * never wires up Clerk either — Clerk requires reaching its own CDN to load,
 * which would otherwise block the whole app on a blank screen with no network.
 * Everywhere that decides whether to mount ClerkProvider / gate a route /
 * render the SignIn form must go through this single export, not re-read
 * `import.meta.env` directly (three places did that independently before and
 * drifted out of sync with the demo-mode exception).
 */
export const clerkPublishableKey: string | undefined = isDemoMode()
  ? undefined
  : (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined);

/** The single ApprovalApi instance the whole console talks through. */
export const api: ApprovalApi = isDemoMode() ? new SeedApi() : new HttpApi(resolveApiBase());

/** Wire Clerk's session token getter into the API client (no-op in demo mode). */
export const setApiClerkToken = (getClerkToken: () => Promise<string | null>): void => {
  if (api instanceof HttpApi) {
    api.setGetClerkToken(getClerkToken);
  }
};

/** Set the agent DID that per-agent governance calls target (no-op in demo mode). */
export const setApiAgentDid = (did: string): void => {
  if (api instanceof HttpApi) {
    api.setAgentDid(did);
  }
};

export const isHttpApi = (): boolean => api instanceof HttpApi;
