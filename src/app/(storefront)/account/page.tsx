import Link from "next/link";
import { getCurrentUser } from "@/features/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { data: profile } = user
    ? await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Welcome{name ? `, ${name}` : ""}
      </h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{user?.email}</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {[
          { href: "/account/profile", label: "Profile" },
          { href: "/account/addresses", label: "Addresses" },
          { href: "/account/orders", label: "Orders" },
          { href: "/account/payments", label: "Payments" },
        ].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-5 text-sm font-medium hover:border-[var(--color-primary)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
