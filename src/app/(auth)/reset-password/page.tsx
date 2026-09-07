import { AuthShell } from "@/features/auth/components/AuthShell";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Choose a new password for your account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
