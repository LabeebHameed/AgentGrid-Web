import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App, { ClerkAppWrapper } from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Must run before Clerk changes the URL during auth flow.
// We stamp a timestamp alongside the port so we can expire stale keys —
// a key without a timestamp is from an old code version and is always stale.
const _cliPort = new URLSearchParams(window.location.search).get("login_cli_port");
if (_cliPort) {
  sessionStorage.setItem("agentgrid_login_cli_port", _cliPort);
  sessionStorage.setItem("agentgrid_login_cli_port_ts", String(Date.now()));
} else {
  // Discard any key that has no timestamp (stuck from before the fix) or is
  // older than 5 minutes — the Clerk auth redirect completes in seconds.
  const _ts = sessionStorage.getItem("agentgrid_login_cli_port_ts");
  if (!_ts || Date.now() - Number(_ts) > 5 * 60 * 1000) {
    sessionStorage.removeItem("agentgrid_login_cli_port");
    sessionStorage.removeItem("agentgrid_login_cli_port_ts");
  }
}

const root = document.getElementById("root");
if (root === null) throw new Error("missing #root");

const renderApp = () => {
  if (PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <ClerkAppWrapper />
      </ClerkProvider>
    );
  }
  return <App />;
};

createRoot(root).render(
  <StrictMode>
    {renderApp()}
  </StrictMode>,
);
