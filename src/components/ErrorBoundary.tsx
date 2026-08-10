import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard ErrorBoundary caught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center min-h-[300px]">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {this.props.fallbackTitle ?? "Page Component Encountered an Error"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mb-6 font-mono bg-background/50 p-3 rounded-lg border border-border/40 text-left overflow-x-auto">
            {this.state.error?.message ?? "An unexpected rendering error occurred."}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2 text-xs">
            <RefreshCw size={12} />
            Try Reloading Component
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
