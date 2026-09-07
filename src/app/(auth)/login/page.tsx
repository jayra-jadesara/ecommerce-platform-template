import { Suspense } from "react";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoadingState } from "@/components/ui/LoadingState";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your account to manage orders and profile details."
    >
      <Suspense fallback={<LoadingState label="Loading…" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
