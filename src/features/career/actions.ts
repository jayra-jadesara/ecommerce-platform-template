"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/features/auth/session";
import {
  createAdminJobPost,
  deleteAdminJobPost,
  insertCareerApplication,
  updateAdminJobPost,
  updateCareerApplicationStatus,
} from "@/features/career/service";
import { careerApplicationFormSchema } from "@/features/career/schemas";
import { formatAddressPhoneForStorage } from "@/features/addresses/validation";
import { getStorePhoneCountryCode } from "@/lib/store-location";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

export async function createJobPostAction(raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "CREATE_JOB_POST",
      feature: "CAREER",
      entityType: "job_post",
      route: "/content/career",
    },
    async () => {
      const result = await createAdminJobPost(raw);
      if (result.ok) revalidatePath("/career");
      return result;
    },
  );
}

export async function updateJobPostAction(id: string, raw: unknown) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_JOB_POST",
      feature: "CAREER",
      entityType: "job_post",
      entityId: id,
      route: "/content/career",
    },
    async () => {
      const result = await updateAdminJobPost(id, raw);
      if (result.ok) revalidatePath("/career");
      return result;
    },
  );
}

export async function deleteJobPostAction(id: string) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "DELETE_JOB_POST",
      feature: "CAREER",
      entityType: "job_post",
      entityId: id,
      route: "/content/career",
    },
    async () => {
      const result = await deleteAdminJobPost(id);
      if (result.ok) revalidatePath("/career");
      return result;
    },
  );
}

export async function updateCareerApplicationStatusAction(
  id: string,
  status: unknown,
) {
  await requirePermission("content.update");
  return runLoggedMutation(
    {
      type: "CMS",
      source: "SERVER",
      operation: "UPDATE_CAREER_APPLICATION",
      feature: "CAREER",
      entityType: "career_application",
      entityId: id,
      route: "/content/career",
    },
    () => updateCareerApplicationStatus(id, status),
  );
}

/** Public apply form — text fields only; no file upload. */
export async function submitCareerApplicationAction(raw: unknown) {
  const { enforceRateLimit, rateLimitErrorMessage } = await import(
    "@/lib/security/server-rate-limit"
  );
  const limited = await enforceRateLimit("career");
  if (!limited.allowed) {
    return {
      ok: false as const,
      error: rateLimitErrorMessage(limited.retryAfterMs),
    };
  }

  const parsed = careerApplicationFormSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
      fieldErrors,
    };
  }

  const v = parsed.data;
  const dialCode = await getStorePhoneCountryCode();
  const result = await insertCareerApplication({
    name: v.name,
    email: v.email,
    phone: formatAddressPhoneForStorage(v.phone, dialCode),
    state: v.state,
    city: v.city,
    department: v.department,
    position: v.position,
    jobPostId: v.jobPostId,
    linkedinUrl: v.linkedinUrl,
    message: v.message,
  });

  if (!result.ok) return result;
  return {
    ok: true as const,
    message:
      "Application received. Email your CV to the careers address shown on this page.",
  };
}
