import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-ink-800 mb-1">Something went wrong</p>
          <p className="text-xs text-ink-500 mb-4 max-w-sm">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg px-3 py-1.5"
          >
            <RefreshCw className="h-3 w-3" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
