import React from 'react';
import { ShieldAlert, RotateCcw, Home, FileText } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service if needed
    console.error('⚠️ YouCollab Crash caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex flex-col justify-center items-center p-6 text-center select-none">
          {/* Decorative Glow Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="w-full max-w-xl space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/20 text-red-500 flex items-center justify-center mx-auto shadow-md">
                <ShieldAlert size={36} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-dark-text leading-tight">
                Something went wrong
              </h1>
              <p className="text-neutral-500 dark:text-dark-muted max-w-md mx-auto text-sm leading-relaxed">
                An unexpected error occurred in your workspace. We've caught it safely to prevent a blank white screen.
              </p>
            </div>

            {/* Error Message Details */}
            <div className="rounded-2xl border border-red-200/50 bg-red-50/50 p-4 text-left dark:border-red-900/30 dark:bg-red-950/10 max-h-48 overflow-y-auto">
              <div className="flex gap-2 text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2">
                <FileText size={14} /> Error Diagnostics
              </div>
              <p className="font-mono text-xs font-semibold text-red-600 dark:text-red-300 break-words leading-relaxed">
                {this.state.error?.toString() || 'Unknown runtime exception'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="font-mono text-[10px] text-neutral-400 dark:text-dark-muted mt-3 overflow-x-auto whitespace-pre-wrap leading-tight">
                  {this.state.errorInfo.componentStack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shadow-primary/10"
              >
                <RotateCcw size={16} />
                Try Reloading App
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 active:scale-[0.98] transition-all dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-dark-bg"
              >
                <Home size={16} />
                Go to Landing Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
