import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

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
    console.error('[ANVESH Runtime ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="anvesh-error-boundary-fallback"
          style={{
            padding: '3rem 1.5rem',
            maxWidth: '640px',
            margin: '4rem auto',
            textAlign: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '12px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              marginBottom: '1rem',
            }}
          >
            <ShieldAlert size={36} aria-hidden="true" />
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#0F172A',
              marginBottom: '0.5rem',
            }}
          >
            {this.props.fallbackTitle || 'Component Rendering Recovery'}
          </h2>
          <p
            style={{
              fontSize: '0.925rem',
              color: '#475569',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}
          >
            A component encounter a display condition. In accordance with clinical system safety standards,
            the core application shell remains active and uncorrupted.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.625rem 1.25rem',
              backgroundColor: '#0E7C86',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Reload Interface</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
