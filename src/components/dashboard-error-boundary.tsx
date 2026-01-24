"use client";

import { ErrorBoundary } from "./error-boundary";

interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Client-side error boundary wrapper for the dashboard layout.
 * Since the layout is a server component, we need a client component wrapper.
 */
export function DashboardErrorBoundary({
  children,
}: DashboardErrorBoundaryProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
