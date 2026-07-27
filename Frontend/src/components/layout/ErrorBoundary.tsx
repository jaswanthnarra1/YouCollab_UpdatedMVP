import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/common/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, any render-time throw unmounts the whole tree and the user sees
// a blank screen with no way back.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="border border-border rounded-sm p-8 max-w-md w-full space-y-4 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-[13px] text-muted-foreground">
              This page hit an unexpected error. Your data is safe — try again, or head back to the dashboard.
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <Button size="sm" onClick={() => this.setState({ error: null })} className="h-8 text-[12px] rounded-sm">
              Try again
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { window.location.href = "/"; }}
              className="h-8 text-[12px] rounded-sm"
            >
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
