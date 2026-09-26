/**
 * Next.js 16.3 Node-stream path reports client-aborted RSC responses as a
 * generic render error. Upstream fix: vercel/next.js#96715 (not in 16.3.x stable).
 * Treat as expected cancellation until we can upgrade past that fix.
 */
export const BENIGN_NEXT_STREAM_ABORT_MESSAGE =
  "The destination stream closed early.";

export function isBenignNextStreamAbort(
  error: unknown,
): boolean {
  if (error == null) return false;
  if (typeof error === "string") {
    return error.includes(BENIGN_NEXT_STREAM_ABORT_MESSAGE);
  }
  if (error instanceof Error) {
    return error.message === BENIGN_NEXT_STREAM_ABORT_MESSAGE;
  }
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return (
      typeof message === "string" &&
      message === BENIGN_NEXT_STREAM_ABORT_MESSAGE
    );
  }
  return false;
}
