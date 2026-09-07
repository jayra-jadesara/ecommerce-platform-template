import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="We’ll email you a link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
