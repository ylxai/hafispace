"use client";

import { Component, type ErrorInfo,type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // TODO: Once a logging library is chosen, integrate it here.
    // ErrorBoundary: error sudah di-capture oleh React untuk display di UI
    // Di production, ini bisa di-report ke Sentry via Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-600">Something went wrong</p>
            <p className="mt-1 text-xs text-red-400">{this.state.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
