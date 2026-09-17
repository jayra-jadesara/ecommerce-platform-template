import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeContentAudit } from "@/features/cms/audit";
import {
  jobPostFormSchema,
  careerApplicationStatusSchema,
  type JobPostFormValues,
} from "@/features/career/schemas";
import type { CareerApplication, JobPost } from "@/features/career/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { zodValidationFailure, type FieldErrors } from "@/lib/validation";
import type { Tables } from "@/types/database";

function mapJobPost(row: Tables<"job_posts">): JobPost {
  return {
    id: row.id,
    storeId: row.store_id,
    title: row.title,
    department: row.department,
    position: row.position,
    location: row.location,
    state: row.state,
    description: row.description,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplication(row: Tables<"career_applications">): CareerApplication {
  return {
    id: row.id,
    storeId: row.store_id,
    jobPostId: row.job_post_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    state: row.state,
    city: row.city,
    department: row.department,
    position: row.position,
    linkedinUrl: row.linkedin_url,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAdminJobPosts(): Promise<JobPost[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("job_posts")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapJobPost);
}

export async function listPublishedJobPosts(): Promise<JobPost[]> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("job_posts")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapJobPost);
}

export type JobPostMutationResult =
  | { ok: true; job: JobPost; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function createAdminJobPost(
  raw: unknown,
): Promise<JobPostMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = jobPostFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid job post.");
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("job_posts")
    .insert({
      store_id: storeId,
      title: values.title,
      department: values.department,
      position: values.position,
      location: values.location,
      state: values.state,
      description: values.description,
      is_published: values.isPublished,
      sort_order: values.sortOrder,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to create job post." };
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "JOB_POST_CREATED",
    entityType: "job_post",
    entityId: data.id,
    metadata: { title: values.title },
  });

  return { ok: true, job: mapJobPost(data), message: "Job post created." };
}

export async function updateAdminJobPost(
  id: string,
  raw: unknown,
): Promise<JobPostMutationResult> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = jobPostFormSchema.safeParse(raw);
  if (!parsed.success) {
    return zodValidationFailure(parsed.error, "Invalid job post.");
  }

  const values: JobPostFormValues = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("job_posts")
    .update({
      title: values.title,
      department: values.department,
      position: values.position,
      location: values.location,
      state: values.state,
      description: values.description,
      is_published: values.isPublished,
      sort_order: values.sortOrder,
    })
    .eq("id", id)
    .eq("store_id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to update job post." };
  }

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "JOB_POST_UPDATED",
    entityType: "job_post",
    entityId: id,
    metadata: { title: values.title },
  });

  return { ok: true, job: mapJobPost(data), message: "Job post saved." };
}

export async function deleteAdminJobPost(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  const { error } = await supabase
    .from("job_posts")
    .delete()
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to delete job post." };

  await writeContentAudit({
    storeId,
    userId: user?.id ?? null,
    action: "JOB_POST_DELETED",
    entityType: "job_post",
    entityId: id,
    metadata: {},
  });

  return { ok: true };
}

export async function listAdminCareerApplications(): Promise<
  CareerApplication[]
> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("career_applications")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []).map(mapApplication);
}

export async function updateCareerApplicationStatus(
  id: string,
  status: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store not found." };

  const parsed = careerApplicationStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("career_applications")
    .update({ status: parsed.data })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return { ok: false, error: "Unable to update application." };
  return { ok: true };
}

export async function insertCareerApplication(input: {
  name: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  department: string;
  position: string;
  jobPostId: string | null;
  linkedinUrl: string | null;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const storeId = await resolveActiveStoreId();
  if (!storeId) return { ok: false, error: "Store unavailable." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("career_applications").insert({
    store_id: storeId,
    job_post_id: input.jobPostId,
    name: input.name,
    email: input.email.trim().toLowerCase(),
    phone: input.phone,
    state: input.state,
    city: input.city,
    department: input.department,
    position: input.position,
    linkedin_url: input.linkedinUrl,
    message: input.message,
    status: "NEW",
  });

  if (error) return { ok: false, error: "Unable to submit application." };
  return { ok: true };
}
