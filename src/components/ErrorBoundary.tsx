import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Without a boundary, any uncaught error during render unmounts the entire tree and
// leaves a blank white page in production (dev hides this behind Vite's overlay).
// This catches it and shows an actionable fallback instead of nothing.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real cause in production consoles for debugging.
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            color: "var(--ad-fg, #0a0a0a)",
            background: "var(--ad-bg, #ffffff)",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0, maxWidth: 420 }}>
            The page failed to load. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 4,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

