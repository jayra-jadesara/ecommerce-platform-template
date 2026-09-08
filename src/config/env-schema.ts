/**
 * Environment classification for white-label deployments.
 * Pure module — safe for scripts and unit tests (no Next imports).
 */

export type EnvRequirement = "required" | "production" | "optional" | "payments";

export type EnvVarSpec = {
  key: string;
  requirement: EnvRequirement;
  public: boolean;
  description: string;
};

export const ENV_VAR_SPECS: EnvVarSpec[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    requirement: "required",
    public: true,
    description: "Supabase project URL (https://YOUR_REF.supabase.co)",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    requirement: "required",
    public: true,
    description: "Supabase anonymous/public key",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    requirement: "required",
    public: true,
    description: "Canonical site origin (https://client-domain.com)",
  },
  {
    key: "ADMIN_ROUTE",
    requirement: "optional",
    public: false,
    description: "Admin URL segment (default manage-store) — not a security boundary",
  },
  {
    key: "STORE_SLUG",
    requirement: "optional",
    public: false,
    description: "Active stores.slug when multiple stores exist",
  },
  {
    key: "NEXT_PUBLIC_STORE_SLUG",
    requirement: "optional",
    public: true,
    description: "Optional public mirror of STORE_SLUG",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    requirement: "production",
    public: false,
    description: "Server-only service role key (guest cart, payments, webhooks)",
  },
  {
    key: "GUEST_CART_SECRET",
    requirement: "production",
    public: false,
    description: "HMAC secret for guest cart cookie (required in production)",
  },
  {
    key: "GUEST_CART_TTL_DAYS",
    requirement: "optional",
    public: false,
    description: "Guest cart cookie TTL in days (default 30)",
  },
  {
    key: "RAZORPAY_KEY_ID",
    requirement: "payments",
    public: false,
    description: "Razorpay key id (required when accepting online payments)",
  },
  {
    key: "RAZORPAY_KEY_SECRET",
    requirement: "payments",
    public: false,
    description: "Razorpay key secret (server-only)",
  },
  {
    key: "RAZORPAY_WEBHOOK_SECRET",
    requirement: "payments",
    public: false,
    description: "Razorpay webhook HMAC secret",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM",
    requirement: "optional",
    public: true,
    description: "Enable Supabase image transforms when available (true/1)",
  },
  {
    key: "NEXT_PUBLIC_ENABLE_SW_DEV",
    requirement: "optional",
    public: true,
    description: "Register service worker in development (1 to enable)",
  },
];

export type EnvValidationIssue = {
  key: string;
  level: "error" | "warning";
  message: string;
};

export type EnvValidationResult = {
  ok: boolean;
  issues: EnvValidationIssue[];
};

function isProduction(nodeEnv: string | undefined): boolean {
  return (nodeEnv || "").trim() === "production";
}

function paymentsEnabled(env: Record<string, string | undefined>): boolean {
  const providerHint = (env.PAYMENT_PROVIDER || "").trim().toLowerCase();
  if (providerHint === "none" || providerHint === "disabled") return false;
  // If any Razorpay key is set, treat payments as enabled for validation.
  return Boolean(
    env.RAZORPAY_KEY_ID?.trim() ||
      env.RAZORPAY_KEY_SECRET?.trim() ||
      env.RAZORPAY_WEBHOOK_SECRET?.trim(),
  );
}

function looksLikeSecretPublicKey(key: string): boolean {
  return (
    key.startsWith("NEXT_PUBLIC_") &&
    /(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE)/i.test(key)
  );
}

/**
 * Validate environment for a deployment mode.
 * Never returns secret values — only keys and messages.
 */
export function validateEnvironment(
  env: Record<string, string | undefined>,
  options?: { nodeEnv?: string; requirePayments?: boolean },
): EnvValidationResult {
  const nodeEnv = options?.nodeEnv ?? env.NODE_ENV;
  const production = isProduction(nodeEnv);
  const needPayments =
    options?.requirePayments === true ||
    (options?.requirePayments !== false && paymentsEnabled(env));

  const issues: EnvValidationIssue[] = [];

  for (const spec of ENV_VAR_SPECS) {
    const value = env[spec.key]?.trim() ?? "";
    const missing = !value;

    if (spec.requirement === "required" && missing) {
      issues.push({
        key: spec.key,
        level: "error",
        message: `${spec.key} is required for all deployments.`,
      });
      continue;
    }

    if (spec.requirement === "production" && production && missing) {
      issues.push({
        key: spec.key,
        level: "error",
        message: `${spec.key} is required in production.`,
      });
      continue;
    }

    if (spec.requirement === "payments" && needPayments && missing) {
      issues.push({
        key: spec.key,
        level: "error",
        message: `${spec.key} is required when Razorpay payments are configured.`,
      });
    }
  }

  for (const key of Object.keys(env)) {
    if (looksLikeSecretPublicKey(key) && env[key]?.trim()) {
      issues.push({
        key,
        level: "error",
        message: `${key} looks like a secret exposed via NEXT_PUBLIC_. Remove it.`,
      });
    }
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  if (url && !/^https?:\/\//i.test(url)) {
    issues.push({
      key: "NEXT_PUBLIC_SUPABASE_URL",
      level: "error",
      message: "NEXT_PUBLIC_SUPABASE_URL must include https://",
    });
  }

  const site = env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (site && !/^https?:\/\//i.test(site)) {
    issues.push({
      key: "NEXT_PUBLIC_SITE_URL",
      level: "error",
      message: "NEXT_PUBLIC_SITE_URL must include http:// or https://",
    });
  }

  if (
    production &&
    site &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(site)
  ) {
    issues.push({
      key: "NEXT_PUBLIC_SITE_URL",
      level: "warning",
      message: "NEXT_PUBLIC_SITE_URL still points at localhost in production.",
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
  };
}

/** Keys that must never appear with NEXT_PUBLIC_ prefix. */
export const FORBIDDEN_PUBLIC_SECRET_PATTERNS = [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
  "NEXT_PUBLIC_RAZORPAY_KEY_SECRET",
  "NEXT_PUBLIC_RAZORPAY_WEBHOOK",
  "NEXT_PUBLIC_GUEST_CART_SECRET",
] as const;
