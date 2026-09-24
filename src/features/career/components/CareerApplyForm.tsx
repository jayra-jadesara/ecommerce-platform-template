"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { submitCareerApplicationAction } from "@/features/career/actions";
import { careerApplicationFormSchema } from "@/features/career/schemas";
import { useIndiaStateCity } from "@/features/career/hooks/useIndiaStateCity";
import type { JobPost } from "@/features/career/types";
import { StorefrontSelect } from "@/components/ui/StorefrontSelect";
import { sfBtn, sfEyebrow } from "@/components/ui/storefront-classes";
import { sanitizeIndianMobileInput } from "@/features/auth/components/IndianMobileField";
import { REGISTER_COUNTRY_CODE } from "@/features/auth/validations";
import { cn } from "@/lib/cn";

type CareerApplyFormProps = {
  jobs: JobPost[];
  formTitle?: string;
  careersEmail?: string | null;
  selectedJobId?: string | null;
  phoneCountryCode?: string;
};

type FieldKey =
  | "name"
  | "email"
  | "phone"
  | "state"
  | "city"
  | "department"
  | "position"
  | "linkedinUrl"
  | "message";

export function CareerApplyForm({
  jobs,
  formTitle = "Apply now",
  careersEmail,
  selectedJobId = null,
  phoneCountryCode = REGISTER_COUNTRY_CODE,
}: CareerApplyFormProps) {
  const initialJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobs) {
      if (job.department.trim()) set.add(job.department.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const positionsByDept = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const job of jobs) {
      const dept = job.department.trim();
      const pos = job.position.trim() || job.title.trim();
      if (!dept || !pos) continue;
      const list = map.get(dept) ?? [];
      if (!list.includes(pos)) list.push(pos);
      map.set(dept, list);
    }
    return map;
  }, [jobs]);

  const {
    states,
    cities,
    loading: geoLoading,
    citiesLoading,
    onStateNameChange,
  } = useIndiaStateCity({
    stateName: initialJob?.state,
    cityName: initialJob?.location,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState(initialJob?.state ?? "");
  const [city, setCity] = useState(initialJob?.location ?? "");
  const [department, setDepartment] = useState(
    initialJob?.department?.trim() || "",
  );
  const [position, setPosition] = useState(
    initialJob?.position?.trim() || initialJob?.title || "",
  );
  const [jobPostId, setJobPostId] = useState(initialJob?.id ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldKey, string>>
  >({});
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const positionOptions = positionsByDept.get(department) ?? [];

  function clearFieldError(key: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateClient(): boolean {
    const parsed = careerApplicationFormSchema.safeParse({
      name,
      email,
      phone,
      state,
      city,
      department,
      position,
      jobPostId: jobPostId || null,
      linkedinUrl: linkedinUrl || null,
      message,
    });
    if (parsed.success) {
      setFieldErrors({});
      return true;
    }
    const next: Partial<Record<FieldKey, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !next[key as FieldKey]) {
        next[key as FieldKey] = issue.message;
      }
    }
    setFieldErrors(next);
    setError(parsed.error.issues[0]?.message ?? "Please check the form.");
    return false;
  }

  return (
    <div className="sf-career-apply">
      <p className={sfEyebrow()}>Application</p>
      <h2 className="sf-career-apply__title">{formTitle}</h2>
      {jobs.length > 0 ? (
        <p className="sf-career-apply__hint">
          Pick a role beside this form, or choose department and position below.
        </p>
      ) : null}

      <form
        className="sf-career-apply__form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSuccess(null);
          if (!validateClient()) return;
          startTransition(async () => {
            const result = await submitCareerApplicationAction({
              name,
              email,
              phone,
              state,
              city,
              department,
              position,
              jobPostId: jobPostId || null,
              linkedinUrl: linkedinUrl || null,
              message,
            });
            if (!result.ok) {
              if ("fieldErrors" in result && result.fieldErrors) {
                setFieldErrors(
                  result.fieldErrors as Partial<Record<FieldKey, string>>,
                );
              }
              setError(result.error);
              return;
            }
            setSuccess(result.message);
            setName("");
            setEmail("");
            setPhone("");
            setCity("");
            setLinkedinUrl("");
            setMessage("");
            setFieldErrors({});
          });
        }}
      >
        <div className="sf-career-apply__grid">
          <Field
            id="career-state"
            label="State"
            required
            error={fieldErrors.state}
          >
            <StorefrontSelect
              id="career-state"
              disabled={pending || geoLoading}
              error={Boolean(fieldErrors.state)}
              value={state}
              emptyLabel={geoLoading ? "Loading…" : "Please select"}
              options={states.map((s) => ({ value: s.name, label: s.name }))}
              onChange={(next) => {
                setState(next);
                setCity("");
                clearFieldError("state");
                clearFieldError("city");
                void onStateNameChange(next);
              }}
            />
          </Field>

          <Field
            id="career-city"
            label="City"
            required
            error={fieldErrors.city}
          >
            <StorefrontSelect
              id="career-city"
              disabled={pending || !state || citiesLoading}
              error={Boolean(fieldErrors.city)}
              value={city}
              emptyLabel={
                !state
                  ? "Select state first"
                  : citiesLoading
                    ? "Loading…"
                    : "Please select"
              }
              options={cities.map((c) => ({ value: c.name, label: c.name }))}
              fallbackOption={
                city && !cities.some((c) => c.name === city)
                  ? { value: city, label: city }
                  : null
              }
              onChange={(next) => {
                setCity(next);
                clearFieldError("city");
              }}
            />
          </Field>

          <Field
            id="career-department"
            label="Department"
            required
            error={fieldErrors.department}
          >
            <StorefrontSelect
              id="career-department"
              disabled={pending || departments.length === 0}
              error={Boolean(fieldErrors.department)}
              value={department}
              emptyLabel={
                departments.length === 0
                  ? "No departments yet"
                  : "Please select"
              }
              options={departments.map((d) => ({ value: d, label: d }))}
              onChange={(next) => {
                setDepartment(next);
                setPosition("");
                setJobPostId("");
                clearFieldError("department");
                clearFieldError("position");
              }}
            />
          </Field>

          <Field
            id="career-position"
            label="Position"
            required
            error={fieldErrors.position}
          >
            <StorefrontSelect
              id="career-position"
              disabled={pending || !department}
              error={Boolean(fieldErrors.position)}
              value={position}
              emptyLabel={
                !department ? "Select department first" : "Please select"
              }
              options={positionOptions.map((p) => ({ value: p, label: p }))}
              onChange={(value) => {
                setPosition(value);
                clearFieldError("position");
                const match = jobs.find(
                  (j) =>
                    j.department.trim() === department &&
                    (j.position.trim() || j.title) === value,
                );
                setJobPostId(match?.id ?? "");
              }}
            />
          </Field>

          <Field
            id="career-name"
            label="Your name"
            required
            error={fieldErrors.name}
          >
            <input
              id="career-name"
              disabled={pending}
              className={cn("sf-field", fieldErrors.name && "sf-field--error")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              autoComplete="name"
            />
          </Field>

          <Field
            id="career-email"
            label="Email"
            required
            error={fieldErrors.email}
          >
            <input
              id="career-email"
              type="email"
              disabled={pending}
              className={cn("sf-field", fieldErrors.email && "sf-field--error")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError("email");
              }}
              autoComplete="email"
            />
          </Field>

          <Field
            id="career-phone"
            label="Phone"
            required
            error={fieldErrors.phone}
          >
            <div className="sf-phone">
              <span className="sf-phone__code" aria-hidden>
                {phoneCountryCode}
              </span>
              <input
                id="career-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="9876543210"
                maxLength={10}
                disabled={pending}
                className={cn(
                  "sf-field sf-phone__input",
                  fieldErrors.phone && "sf-field--error",
                )}
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizeIndianMobileInput(e.target.value));
                  clearFieldError("phone");
                }}
                aria-describedby="career-phone-hint"
              />
            </div>
            <p id="career-phone-hint" className="sf-career-field-hint">
              10-digit mobile number
            </p>
          </Field>

          <Field
            id="career-linkedin"
            label="LinkedIn / portfolio"
            error={fieldErrors.linkedinUrl}
          >
            <input
              id="career-linkedin"
              type="url"
              disabled={pending}
              className={cn(
                "sf-field",
                fieldErrors.linkedinUrl && "sf-field--error",
              )}
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                clearFieldError("linkedinUrl");
              }}
              placeholder="https://"
            />
          </Field>

          <div className="sf-career-apply__full">
            <Field id="career-message" label="Message">
              <textarea
                id="career-message"
                rows={2}
                disabled={pending}
                className="sf-field sf-field--area"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {careersEmail ? (
          <p className="sf-career-apply__cv">
            No file uploads. Prefer email? Send your CV to{" "}
            <a href={`mailto:${careersEmail}?subject=${encodeURIComponent("Career application")}`}>
              {careersEmail}
            </a>
            .
          </p>
        ) : (
          <p className="sf-career-apply__cv">
            No file uploads — email your CV to the store contact after submitting.
          </p>
        )}

        <button type="submit" disabled={pending} className={sfBtn("primary")}>
          {pending ? "Submitting…" : "Submit application"}
        </button>

        {error ? (
          <p className="sf-career-apply__alert" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="sf-career-apply__ok" role="status">
            {success}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="sf-career-field-wrap">
      <label className="sf-career-label" htmlFor={id}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children}
      {error ? <p className="sf-career-field-error">{error}</p> : null}
    </div>
  );
}

export function JobPostsList({
  jobs,
  onSelect,
  selectedId,
}: {
  jobs: JobPost[];
  onSelect?: (job: JobPost) => void;
  selectedId?: string | null;
}) {
  if (jobs.length === 0) {
    return (
      <p className="sf-career-roles__empty">No open roles right now.</p>
    );
  }

  return (
    <ul className="sf-career-roles__list">
      {jobs.map((job) => {
        const active = selectedId === job.id;
        return (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelect?.(job)}
              className={cn(
                "sf-career-role",
                active && "sf-career-role--active",
              )}
            >
              <span className="sf-career-role__title">{job.title}</span>
              {job.department ? (
                <span className="sf-career-role__meta">{job.department}</span>
              ) : null}
              {[job.position, job.location, job.state].some(Boolean) ? (
                <span className="sf-career-role__loc">
                  {[
                    job.position,
                    [job.location, job.state].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" — ")}
                </span>
              ) : null}
              {job.description ? (
                <span className="sf-career-role__desc">{job.description}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
