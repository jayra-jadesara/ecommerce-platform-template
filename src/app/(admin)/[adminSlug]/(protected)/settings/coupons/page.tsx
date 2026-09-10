import Link from "next/link";
import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import {
  getAdminCoupon,
  listAdminCoupons,
  toCouponFormValues,
} from "@/features/coupons/admin-service";
import { CouponForm } from "@/features/coupons/components/CouponForm";
import { CouponListTable } from "@/features/coupons/components/CouponListTable";
import { DEFAULT_COUPON_FORM } from "@/features/coupons/schemas";

export const dynamic = "force-dynamic";

type Panel = "list" | "new" | "edit";

function parsePanel(value: string | undefined): Panel {
  if (value === "new" || value === "edit") return value;
  return "list";
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("coupons.view");
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const panel = parsePanel(flat.panel);
  const listHref = getAdminPath("/settings/coupons");
  const canCreate = hasPermission(admin, "coupons.create");
  const canUpdate = hasPermission(admin, "coupons.update");
  const canDelete = hasPermission(admin, "coupons.delete");

  if (panel === "new") {
    if (!canCreate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader
            title="Create coupon"
            description="You don’t have permission to create coupons."
            breadcrumbs={[
              { label: "Store Settings", href: getAdminPath("/settings") },
              { label: "Coupons", href: listHref },
              { label: "Create" },
            ]}
          />
          <Alert severity="warning">
            Ask a store admin for coupon create access.{" "}
            <Link href={listHref} className="underline underline-offset-2">
              Back to coupons
            </Link>
          </Alert>
        </div>
      );
    }

    const listed = await listAdminCoupons();
    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title="Create coupon"
          description="Make a discount code shoppers can enter at checkout."
          breadcrumbs={[
            { label: "Store Settings", href: getAdminPath("/settings") },
            { label: "Coupons", href: listHref },
            { label: "Create" },
          ]}
        />
        <CouponForm
          mode="create"
          initialValues={DEFAULT_COUPON_FORM}
          currency={listed?.currency ?? "INR"}
          canSubmit={canCreate}
        />
      </div>
    );
  }

  if (panel === "edit") {
    if (!canUpdate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader
            title="Edit coupon"
            description="You don’t have permission to update coupons."
            breadcrumbs={[
              { label: "Store Settings", href: getAdminPath("/settings") },
              { label: "Coupons", href: listHref },
              { label: "Edit" },
            ]}
          />
          <Alert severity="warning">
            Ask a store admin for coupon update access.{" "}
            <Link href={listHref} className="underline underline-offset-2">
              Back to coupons
            </Link>
          </Alert>
        </div>
      );
    }

    const coupon = flat.id ? await getAdminCoupon(flat.id) : null;
    if (!coupon) {
      return (
        <div className="space-y-4">
          <AdminPageHeader
            title="Edit coupon"
            breadcrumbs={[
              { label: "Store Settings", href: getAdminPath("/settings") },
              { label: "Coupons", href: listHref },
              { label: "Edit" },
            ]}
          />
          <Alert severity="error">
            Coupon not found.{" "}
            <Link href={listHref} className="underline underline-offset-2">
              Back to coupons
            </Link>
          </Alert>
        </div>
      );
    }

    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title={`Edit ${coupon.code}`}
          description="Change the discount rules. Past uses of this code stay in your records."
          breadcrumbs={[
            { label: "Store Settings", href: getAdminPath("/settings") },
            { label: "Coupons", href: listHref },
            { label: coupon.code },
          ]}
        />
        <CouponForm
          mode="edit"
          couponId={coupon.id}
          initialValues={toCouponFormValues(coupon)}
          currency={coupon.currency}
          canSubmit={canUpdate}
        />
      </div>
    );
  }

  const listed = await listAdminCoupons(flat);
  if (!listed) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Coupons" />
        <Alert severity="error">Unable to load coupons for this store.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Coupons"
        description="Create and manage discount codes for checkout."
        breadcrumbs={[
          { label: "Store Settings", href: getAdminPath("/settings") },
          { label: "Coupons" },
        ]}
      />
      <CouponListTable
        items={listed.items}
        total={listed.total}
        query={listed.query}
        currency={listed.currency}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
