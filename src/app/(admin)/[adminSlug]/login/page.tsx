import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";
import { LoadingState } from "@/components/ui/LoadingState";
import { getPlatformConfigAsync } from "@/config/site";

export default async function AdminLoginPage() {
  const { brand } = await getPlatformConfigAsync();

  return (
    <AuthShell
      title="Admin sign in"
      subtitle={`Sign in to manage ${brand.name}. Custom admin paths are not a security boundary — access requires an active admin role.`}
    >
      <Suspense fallback={<LoadingState label="Loading…" />}>
        <AdminLoginForm />
      </Suspense>
    </AuthShell>
  );
}
