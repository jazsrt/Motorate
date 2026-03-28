import { Component, ErrorInfo, ReactNode } from 'react';
import { captureException } from '../../lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
    });

    // Log to console only in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught error:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }

    this.setState({ error, errorInfo: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
          <div className="text-center max-w-4xl">
            <h1 className="text-2xl font-bold mb-4 text-red-400">Something went wrong</h1>
            <p className="text-gray-400 mb-4">Please try refreshing the page.</p>

            {this.state.error && (
              <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left">
                <p className="text-red-400 font-bold mb-2">Error Details:</p>
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Message:</strong> {this.state.error.message}
                </p>
                <details className="text-gray-400 text-xs">
                  <summary className="cursor-pointer text-accent-primary hover:text-accent-2">
                    Show Stack Trace
                  </summary>
                  <pre className="mt-2 overflow-auto max-h-96 bg-gray-900 p-2 rounded">
                    {this.state.error.stack}
                  </pre>
                </details>
                {this.state.errorInfo && (
                  <details className="text-gray-400 text-xs mt-2">
                    <summary className="cursor-pointer text-accent-primary hover:text-accent-2">
                      Show Component Stack
                    </summary>
                    <pre className="mt-2 overflow-auto max-h-96 bg-gray-900 p-2 rounded">
                      {this.state.errorInfo}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange text-white rounded-lg hover:bg-orange"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
