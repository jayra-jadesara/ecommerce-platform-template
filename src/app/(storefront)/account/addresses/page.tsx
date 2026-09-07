import { AddressBookClient } from "@/features/addresses/components/AddressBookClient";
import { getCustomerAddresses } from "@/features/addresses/service";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  const addresses = await getCustomerAddresses();

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
        Addresses
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Manage shipping addresses for checkout. At most one address is marked
        default.
      </p>
      <div className="mt-6">
        <AddressBookClient initialAddresses={addresses} />
      </div>
    </div>
  );
}
