import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { getStorePhoneCountryCode } from "@/lib/store-location";

export default async function RegisterPage() {
  const phoneCountryCode = await getStorePhoneCountryCode();

  return (
    <AuthShell
      title="Create account"
      subtitle="Register to save addresses and track orders."
    >
      <RegisterForm phoneCountryCode={phoneCountryCode} />
    </AuthShell>
  );
}
