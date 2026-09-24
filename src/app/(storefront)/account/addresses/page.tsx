import { StorefrontHeading } from "@/components/ui/StorefrontHeading";
import { AddressBookClient } from "@/features/addresses/components/AddressBookClient";
import { getCustomerAddresses } from "@/features/addresses/service";
import { getStoreLocationDefaults } from "@/lib/store-location";

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  const [addresses, location] = await Promise.all([
    getCustomerAddresses(),
    getStoreLocationDefaults(),
  ]);

  return (
    <div>
      <StorefrontHeading title="Addresses" as="h2" align="left" className="!text-2xl" />
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Manage shipping addresses for your orders. At most one address is marked
        default.
      </p>
      <div className="mt-6">
        <AddressBookClient
          initialAddresses={addresses}
          phoneCountryCode={location.phoneCountryCode}
          storeCountry={location.country}
        />
      </div>
    </div>
  );
}
