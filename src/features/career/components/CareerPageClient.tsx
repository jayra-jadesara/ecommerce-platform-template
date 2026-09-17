"use client";

import { useState } from "react";
import {
  CareerApplyForm,
  JobPostsList,
} from "@/features/career/components/CareerApplyForm";
import type { JobPost } from "@/features/career/types";
import { sfEyebrow } from "@/components/ui/storefront-classes";

type CareerPageClientProps = {
  jobs: JobPost[];
  formEnabled: boolean;
  formTitle: string;
  careersEmail: string | null;
};

export function CareerPageClient({
  jobs,
  formEnabled,
  formTitle,
  careersEmail,
}: CareerPageClientProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (!formEnabled && jobs.length === 0) return null;

  return (
    <div className="sf-career-split">
      <aside className="sf-career-roles">
        <div className="sf-career-roles__head">
          <p className={sfEyebrow()}>Open roles</p>
          <span className="sf-career-roles__count">{jobs.length}</span>
        </div>
        <JobPostsList
          jobs={jobs}
          selectedId={selectedJobId}
          onSelect={(job) => setSelectedJobId(job.id)}
        />
      </aside>

      {formEnabled ? (
        <section className="sf-career-panel">
          <CareerApplyForm
            key={selectedJobId ?? "none"}
            jobs={jobs}
            formTitle={formTitle}
            careersEmail={careersEmail}
            selectedJobId={selectedJobId}
          />
        </section>
      ) : (
        <section className="sf-career-panel sf-career-panel--muted">
          <p>Applications are closed for now. Browse open roles on the left.</p>
        </section>
      )}
    </div>
  );
}
