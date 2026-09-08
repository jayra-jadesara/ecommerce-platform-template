"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/**
 * Isolates WebGL/R3F failures so header, cart, and checkout stay usable.
 */
export class ThreeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally quiet — fallback UI is enough for storefront UX.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
