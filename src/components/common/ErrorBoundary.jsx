import React from 'react';

/**
 * Production-grade React Error Boundary for Sales Command OS.
 *
 * Features:
 * - Catches render / lifecycle errors and shows a graceful fallback UI
 * - Supports `onError(error, errorInfo)` callback prop for external logging
 * - Supports `fallback={(error, reset) => <CustomUI />}` render prop
 * - Premium dark-themed fallback card matching the SalesOS design system
 * - Collapsible technical details (component stack, error message)
 * - "Reload Application" + "Try Again" buttons
 * - Respects prefers-reduced-motion
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    } else {
      console.error('[SalesOS ErrorBoundary] Uncaught error:', {
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset() {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;

    // Support custom fallback render prop
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.handleReset);
    }

    return <DefaultFallback error={error} errorInfo={errorInfo} onReset={this.handleReset} />;
  }
}

/* -------------------------------------------------------------------------- */
/*  Default Fallback UI                                                       */
/* -------------------------------------------------------------------------- */

function DefaultFallback({ error, errorInfo, onReset }) {
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#06080f]/95 backdrop-blur-xl p-6"
      role="alert"
      aria-live="assertive"
    >
      {/* Glass card */}
      <div
        className="
          relative w-full max-w-lg
          rounded-2xl border border-white/[0.06]
          bg-gradient-to-b from-white/[0.04] to-white/[0.01]
          shadow-[0_0_80px_rgba(59,130,246,0.06),0_8px_32px_rgba(0,0,0,0.5)]
          p-8
          motion-safe:animate-[errorFadeIn_0.35s_ease-out]
        "
      >
        {/* Subtle glow accent at top */}
        <div className="absolute -top-px left-1/2 -translate-x-1/2 h-[1px] w-2/3 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-red-400"
            aria-hidden="true"
          >
            {/* Shield with exclamation */}
            <path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11c-3.5-1.26-7-5.75-7-11V6l7-4z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-center text-lg font-semibold text-white/90 tracking-tight mb-2">
          Something went wrong
        </h2>

        {/* Subtitle */}
        <p className="text-center text-sm text-white/45 leading-relaxed mb-6 max-w-sm mx-auto">
          SalesOS encountered an unexpected error while rendering this section.
          Your data is safe — you can try again or reload the application.
        </p>

        {/* Technical details */}
        <details className="group mb-6">
          <summary className="flex items-center justify-center gap-2 cursor-pointer text-xs font-medium text-white/30 hover:text-white/50 transition-colors select-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-3.5 h-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
            Technical Details
          </summary>

          <div className="mt-3 rounded-lg bg-black/40 border border-white/[0.04] p-4 overflow-auto max-h-52">
            <p className="text-xs font-mono text-red-400/80 mb-2 break-words whitespace-pre-wrap">
              {error?.message || 'Unknown error'}
            </p>
            {error?.stack && (
              <pre className="text-[11px] font-mono text-white/25 whitespace-pre-wrap break-words leading-relaxed">
                {error.stack}
              </pre>
            )}
            {errorInfo?.componentStack && (
              <>
                <hr className="border-white/[0.06] my-3" />
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-1">
                  Component Stack
                </p>
                <pre className="text-[11px] font-mono text-white/20 whitespace-pre-wrap break-words leading-relaxed">
                  {errorInfo.componentStack}
                </pre>
              </>
            )}
          </div>
        </details>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            type="button"
            className="
              px-4 py-2 text-sm font-medium rounded-lg
              text-white/60 bg-white/[0.04] border border-white/[0.08]
              hover:bg-white/[0.08] hover:text-white/80 hover:border-white/[0.12]
              active:scale-[0.97]
              transition-all motion-reduce:transition-none
              cursor-pointer
            "
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            type="button"
            className="
              px-5 py-2 text-sm font-medium rounded-lg
              text-white bg-blue-600 border border-blue-500/50
              hover:bg-blue-500 hover:border-blue-400/60
              active:scale-[0.97]
              shadow-[0_0_20px_rgba(59,130,246,0.2)]
              transition-all motion-reduce:transition-none
              cursor-pointer
            "
          >
            Reload Application
          </button>
        </div>

        {/* Footer branding */}
        <p className="text-center text-[10px] text-white/15 mt-6 tracking-wider uppercase">
          SalesOS Error Recovery
        </p>
      </div>

      {/* Keyframe injected via style tag (only rendered once with the boundary) */}
      <style>{`
        @keyframes errorFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ErrorBoundary;
