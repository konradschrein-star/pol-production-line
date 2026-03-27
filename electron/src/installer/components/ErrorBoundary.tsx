import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Installer Wizard
 *
 * Catches React component errors and displays a fallback UI instead of blank screen.
 * Critical for production reliability.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(this.state.error);
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 p-8">
          {/* Error Icon */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-900/30 text-5xl text-red-400 shadow-lg">
            ❌
          </div>

          {/* Error Message */}
          <div className="max-w-md text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">
              Something went wrong
            </h2>
            <p className="text-gray-400">
              The wizard encountered an unexpected error. Please restart the installer.
            </p>
          </div>

          {/* Error Details */}
          {this.state.error && (
            <div className="w-full max-w-2xl rounded-xl border border-red-700 bg-red-900/20 p-6 shadow">
              <h3 className="mb-2 text-sm font-semibold text-red-300">
                Technical Details:
              </h3>
              <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-300">
                {this.state.error.toString()}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            </div>
          )}

          {/* Recovery Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-blue-600 bg-blue-600/20 px-6 py-3 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30"
            >
              Restart Wizard
            </button>
            <button
              onClick={() => {
                if (window.electronAPI?.openLogs) {
                  window.electronAPI.openLogs();
                }
              }}
              className="rounded-lg border border-gray-600 bg-gray-700 px-6 py-3 text-sm text-white shadow-sm transition-colors hover:bg-gray-600"
            >
              View Logs
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500">
            If this problem persists, please report it on GitHub with the error details above.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
