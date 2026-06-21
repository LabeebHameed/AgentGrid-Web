import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App, { ClerkAppWrapper } from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Must run before Clerk changes the URL during auth flow
const _cliPort = new URLSearchParams(window.location.search).get("login_cli_port");
if (_cliPort) sessionStorage.setItem("agentgrid_login_cli_port", _cliPort);

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
