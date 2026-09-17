"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import TextField from "@mui/material/TextField";
import { AdminFormDialog } from "@/features/admin/ui/AdminFormDialog";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import { ConfirmDeleteDialog } from "@/features/admin/ui/ConfirmDeleteDialog";
import {
  adminBtn,
  adminFieldsGrid,
  adminSectionDesc,
  adminSectionTitle,
} from "@/features/admin/ui/admin-classes";
import {
  createJobPostAction,
  deleteJobPostAction,
  updateJobPostAction,
} from "@/features/career/actions";
import { useIndiaStateCity } from "@/features/career/hooks/useIndiaStateCity";
import type { JobPost } from "@/features/career/types";
import {
  jobPostFormSchema,
  type JobPostFormValues,
} from "@/features/career/schemas";
import { cn } from "@/lib/cn";

const emptyForm: JobPostFormValues = {
  title: "",
  department: "",
  position: "",
  location: "",
  state: "",
  description: "",
  isPublished: true,
  sortOrder: 0,
};

function JobPostEditorDialog({
  open,
  editingId,
  initial,
  pending,
  onClose,
  onSaved,
}: {
  open: boolean;
  editingId: string | "new";
  initial: JobPostFormValues;
  pending: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<JobPostFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof JobPostFormValues, string>>
  >({});
  const [saving, startTransition] = useTransition();

  const {
    states,
    cities,
    loading: geoLoading,
    citiesLoading,
    onStateNameChange,
  } = useIndiaStateCity({
    stateName: initial.state,
    cityName: initial.location,
  });

  function save() {
    const parsed = jobPostFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof JobPostFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key as keyof JobPostFormValues]) {
          next[key as keyof JobPostFormValues] = issue.message;
        }
      }
      setFieldErrors(next);
      setError(parsed.error.issues[0]?.message ?? "Invalid job post.");
      return;
    }
    setFieldErrors({});
    startTransition(async () => {
      setError(null);
      const result =
        editingId === "new"
          ? await createJobPostAction(parsed.data)
          : await updateJobPostAction(editingId, parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  const busy = pending || saving;

  return (
    <AdminFormDialog
      open={open}
      title={editingId === "new" ? "New job post" : "Edit job post"}
      description="Title, department, and position are required."
      maxWidth="sm"
      pending={busy}
      error={error}
      confirmLabel="Save job"
      onClose={onClose}
      onConfirm={save}
    >
      <div className="grid gap-2.5">
        <TextField
          label="Job title"
          size="small"
          fullWidth
          required
          disabled={busy}
          value={form.title}
          error={Boolean(fieldErrors.title)}
          helperText={fieldErrors.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <div className={adminFieldsGrid()}>
          <TextField
            label="Department"
            size="small"
            fullWidth
            required
            disabled={busy}
            value={form.department}
            error={Boolean(fieldErrors.department)}
            helperText={fieldErrors.department}
            onChange={(e) =>
              setForm((f) => ({ ...f, department: e.target.value }))
            }
          />
          <TextField
            label="Position"
            size="small"
            fullWidth
            required
            disabled={busy}
            value={form.position}
            error={Boolean(fieldErrors.position)}
            helperText={fieldErrors.position}
            onChange={(e) =>
              setForm((f) => ({ ...f, position: e.target.value }))
            }
          />
        </div>
        <div className={adminFieldsGrid()}>
          <AdminSelect
            label="State"
            value={form.state}
            disabled={busy || geoLoading}
            error={Boolean(fieldErrors.state)}
            helperText={fieldErrors.state}
            allowEmpty
            emptyLabel={geoLoading ? "Loading…" : "Select state"}
            options={states.map((s) => ({ value: s.name, label: s.name }))}
            onChange={(value) => {
              setForm((f) => ({ ...f, state: value, location: "" }));
              void onStateNameChange(value);
            }}
          />
          <AdminSelect
            label="City"
            value={form.location}
            disabled={busy || !form.state || citiesLoading}
            error={Boolean(fieldErrors.location)}
            helperText={fieldErrors.location}
            allowEmpty
            emptyLabel={
              !form.state
                ? "Select state first"
                : citiesLoading
                  ? "Loading…"
                  : "Select city"
            }
            options={cities.map((c) => ({ value: c.name, label: c.name }))}
            onChange={(value) => setForm((f) => ({ ...f, location: value }))}
          />
        </div>
        <TextField
          label="Description"
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={3}
          disabled={busy}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
          <TextField
            label="Sort"
            type="number"
            size="small"
            fullWidth
            disabled={busy}
            value={form.sortOrder}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                sortOrder: Number(e.target.value) || 0,
              }))
            }
          />
          <AdminToggle
            checked={form.isPublished}
            disabled={busy}
            onChange={(checked) =>
              setForm((f) => ({ ...f, isPublished: checked }))
            }
            label="Show on storefront"
          />
        </div>
      </div>
    </AdminFormDialog>
  );
}

export function JobPostsManager({
  jobs,
  canUpdate,
}: {
  jobs: JobPost[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [editorInitial, setEditorInitial] =
    useState<JobPostFormValues>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditorInitial({ ...emptyForm, sortOrder: jobs.length });
    setEditingId("new");
    setError(null);
  }

  function openEdit(job: JobPost) {
    setEditorInitial({
      title: job.title,
      department: job.department,
      position: job.position,
      location: job.location,
      state: job.state,
      description: job.description,
      isPublished: job.isPublished,
      sortOrder: job.sortOrder,
    });
    setEditingId(job.id);
    setError(null);
  }

  function closeEditor() {
    if (pending) return;
    setEditingId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={adminSectionTitle()}>Open roles</h3>
          <p className={adminSectionDesc()}>
            Each published role appears on /career and fills Department /
            Position on the apply form.
          </p>
        </div>
        {canUpdate ? (
          <button
            type="button"
            className={adminBtn("primary")}
            onClick={openNew}
            disabled={pending}
          >
            + Add job post
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {jobs.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            No job posts yet. Add your first open role.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Department</th>
                <th className="px-3 py-2.5 font-medium">Position</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Order</th>
                {canUpdate ? (
                  <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-t border-[var(--color-border)]"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--color-foreground)]">
                    {job.title}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {job.department || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {job.position || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {[job.location, job.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                        job.isPublished
                          ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
                          : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                      )}
                    >
                      {job.isPublished ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-muted)]">
                    {job.sortOrder}
                  </td>
                  {canUpdate ? (
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-semibold text-[var(--color-primary)] disabled:opacity-40"
                          disabled={pending}
                          onClick={() => openEdit(job)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-700 disabled:opacity-40"
                          disabled={pending}
                          onClick={() => setDeleteId(job.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingId ? (
        <JobPostEditorDialog
          key={editingId}
          open
          editingId={editingId}
          initial={editorInitial}
          pending={pending}
          onClose={closeEditor}
          onSaved={() => {
            setEditingId(null);
            router.refresh();
          }}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        title="Delete job post?"
        message="Applications linked to this role keep their text fields; the job reference is cleared."
        pending={pending}
        onClose={() => {
          if (pending) return;
          setDeleteId(null);
        }}
        onConfirm={() => {
          if (!deleteId) return;
          startTransition(async () => {
            const result = await deleteJobPostAction(deleteId);
            setDeleteId(null);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      />
    </div>
  );
}
