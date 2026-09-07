"use client";

import { useState, useTransition } from "react";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from "@/features/addresses/actions";
import { AddressForm } from "@/features/addresses/components/AddressForm";
import type { CustomerAddress } from "@/features/addresses/types";
import type { AddressFormInput } from "@/features/addresses/validation";

interface AddressBookClientProps {
  initialAddresses: CustomerAddress[];
}

function formatAddress(address: CustomerAddress): string {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.country,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function AddressBookClient({
  initialAddresses,
}: AddressBookClientProps) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = (next: CustomerAddress[], note?: string) => {
    setAddresses(next);
    setMessage(note ?? null);
    setError(null);
    setMode("list");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {mode === "list" ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setEditing(null);
                setMessage(null);
              }}
              className="rounded-md bg-[var(--color-button-background)] px-3 py-2 text-sm font-medium text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              Add address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
              <p className="font-medium">No saved addresses</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Add a shipping address to use at checkout.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Saved addresses">
              {addresses.map((address) => (
                <li
                  key={address.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {address.fullName}
                        {address.isDefault ? (
                          <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
                            Default
                          </span>
                        ) : null}
                      </p>
                      {address.phone ? (
                        <p className="text-sm text-[var(--color-muted)]">
                          {address.phone}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {formatAddress(address)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setEditing(address);
                        setMode("edit");
                      }}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      Edit
                    </button>
                    {!address.isDefault ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const result = await setDefaultAddressAction({
                              addressId: address.id,
                            });
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            refresh(result.addresses, result.message);
                          });
                        }}
                        className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                      >
                        Set default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Delete address for ${address.fullName}`}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteAddressAction({
                            addressId: address.id,
                          });
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          refresh(result.addresses, result.message);
                        });
                      }}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="mb-3 font-semibold">
            {mode === "edit" ? "Edit address" : "Add address"}
          </h3>
          <AddressForm
            key={editing?.id ?? "new"}
            initial={editing}
            onCancel={() => {
              setMode("list");
              setEditing(null);
            }}
            onSubmit={async (values: AddressFormInput) => {
              const result =
                mode === "edit" && editing
                  ? await updateAddressAction(editing.id, values)
                  : await createAddressAction(values);
              if (!result.ok) return { ok: false, error: result.error };
              refresh(result.addresses, result.message);
              return { ok: true };
            }}
          />
        </div>
      )}
    </div>
  );
}
