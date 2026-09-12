import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { requireUser } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountProfilePage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div>
      <StorefrontHeading title="Profile" as="h2" align="left" className="!text-2xl" />
      <p className="mt-2 text-sm text-[var(--color-muted)]">{user.email}</p>
      <div className="mt-6">
        <ProfileForm
          defaultValues={{
            firstName: profile?.first_name ?? "",
            lastName: profile?.last_name ?? "",
            phone: profile?.phone ?? "",
          }}
        />
      </div>
    </div>
  );
}
