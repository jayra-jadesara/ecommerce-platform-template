import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { getStorePhoneCountryCode } from "@/lib/store-location";

export default async function ForgotPasswordPage() {
  const phoneCountryCode = await getStorePhoneCountryCode();

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your email, mobile number, and security answer to set a new password."
    >
      <ForgotPasswordForm phoneCountryCode={phoneCountryCode} />
    </AuthShell>
  );
}
