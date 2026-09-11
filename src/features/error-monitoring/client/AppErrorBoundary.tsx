"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "@mui/material/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/features/error-monitoring/client/report";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
} from "@/features/error-monitoring/types";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
};

/**
 * Client React error boundary — captures render failures without exposing stacks.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      type: "REACT",
      source: "CLIENT",
      message: error.message || "React render error",
      stack: [error.stack, info.componentStack].filter(Boolean).join("\n"),
      route: typeof window !== "undefined" ? window.location.pathname : null,
      operation: "REACT_RENDER",
      clientFingerprint: `react:${error.message.slice(0, 100)}`,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title={this.props.fallbackTitle ?? CUSTOMER_SAFE_TITLE}
          message={CUSTOMER_SAFE_MESSAGE}
          action={
            <Button
              variant="contained"
              color="primary"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}
