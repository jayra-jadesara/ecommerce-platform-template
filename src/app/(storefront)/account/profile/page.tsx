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
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Profile
      </h2>
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
