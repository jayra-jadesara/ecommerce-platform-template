/**
 * Map Postgres / Supabase constraint codes to business-friendly Admin copy.
 * Never expose raw database messages to users.
 */

export type MappedDbError = {
  kind: "validation" | "dependency" | "unknown";
  message: string;
  suggestion?: "archive" | "deactivate" | "disable";
};

function codeOf(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}

function messageOf(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  if ("message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message.toLowerCase();
  }
  return "";
}

/**
 * Translate unique / FK / check violations into safe Admin language.
 * Returns null when the error is not a known constraint failure.
 */
export function mapDatabaseConstraintError(
  error: unknown,
  context?: {
    entity?: string;
    uniqueHint?: string;
    dependencyHint?: string;
  },
): MappedDbError | null {
  const code = codeOf(error);
  const msg = messageOf(error);
  const entity = context?.entity ?? "item";

  if (code === "23505" || msg.includes("duplicate key")) {
    return {
      kind: "validation",
      message:
        context?.uniqueHint ??
        `That ${entity} already exists. Choose a different value.`,
    };
  }

  if (code === "23503" || msg.includes("foreign key")) {
    return {
      kind: "dependency",
      message:
        context?.dependencyHint ??
        `Can't delete this ${entity} because it is currently being used.`,
      suggestion: "deactivate",
    };
  }

  if (code === "23514" || msg.includes("check constraint")) {
    return {
      kind: "validation",
      message: `Please check the ${entity} values and try again.`,
    };
  }

  return null;
}
