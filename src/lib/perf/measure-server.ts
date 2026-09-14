/**
 * Development-only server timing. No secrets / PII — names and durations only.
 */
export async function measureServerOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: { route?: string },
): Promise<T> {
  if (process.env.NODE_ENV !== "development") {
    return fn();
  }

  const started = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = Math.round(performance.now() - started);
    const route = options?.route ? ` route=${options.route}` : "";
    console.info(`[perf] operation=${operation} durationMs=${durationMs}${route}`);
  }
}
