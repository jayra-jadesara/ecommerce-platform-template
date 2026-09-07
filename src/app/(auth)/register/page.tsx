import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Register to save addresses and track orders."
    >
      <RegisterForm />
    </AuthShell>
  );
}
