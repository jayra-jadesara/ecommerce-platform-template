import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { requireUser } from "@/features/auth/session";
import { toNationalMobileDigits } from "@/features/auth/phone-normalize";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountProfilePage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name, last_name, phone, recovery_question_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
          <PersonOutlineRoundedIcon className="!text-lg" aria-hidden />
        </span>
        <div className="min-w-0">
          <StorefrontHeading
            title="Profile"
            as="h2"
            align="left"
            className="!text-xl"
          />
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Update your name, mobile, and recovery details
          </p>
        </div>
      </div>
      <div className="mt-4">
        <ProfileForm
          email={user.email}
          defaultValues={{
            firstName: profile?.first_name ?? "",
            lastName: profile?.last_name ?? "",
            phone: toNationalMobileDigits(profile?.phone),
            recoveryQuestionId: profile?.recovery_question_id ?? "",
            recoveryAnswer: "",
          }}
        />
      </div>
    </div>
  );
}
