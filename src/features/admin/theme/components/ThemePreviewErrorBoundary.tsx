"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  failed: boolean;
};

/**
 * Keeps Appearance settings usable if the live preview throws.
 */
export class ThemePreviewErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch() {
    // Preview is non-critical — settings form must keep working.
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-center"
          role="status"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Preview unavailable
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Your settings are still editable. Try Light/Dark or refresh the
              page.
            </p>
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-[var(--color-primary)] underline"
              onClick={() => this.setState({ failed: false })}
            >
              Retry preview
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
