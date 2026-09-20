"use client";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import dayjs from "dayjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AccountDateField } from "@/features/account/components/AccountDateField";
import {
  ACCOUNT_DATE_RANGE_OPTIONS,
  parseAccountDateRange,
  type AccountDateRange,
} from "@/features/account/date-range";
import { AdminDatePickersProvider } from "@/features/admin/ui/AdminDatePickersProvider";
import { sfBtn, sfCard } from "@/components/ui/storefront-classes";
import { cn } from "@/lib/cn";

const CONTROL_HEIGHT = 40;

const selectSx = {
  backgroundColor: "var(--color-card)",
  borderRadius: "var(--radius-default, 0.5rem)",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  color: "var(--color-foreground)",
  height: CONTROL_HEIGHT,
  minHeight: CONTROL_HEIGHT,
  "& .MuiSelect-select": {
    display: "flex",
    alignItems: "center",
    py: 0,
    height: CONTROL_HEIGHT,
    boxSizing: "border-box",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-border)",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-primary)",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "var(--color-primary)",
    borderWidth: 1.5,
  },
} as const;

const menuItemSx = {
  fontSize: "0.8125rem",
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  "&.Mui-selected": {
    backgroundColor: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
  },
  "&.Mui-selected:hover": {
    backgroundColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
  },
} as const;

const labelSx = {
  color: "var(--color-primary)",
  fontSize: "0.8125rem",
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  "&.Mui-focused": { color: "var(--color-primary)" },
} as const;

export function AccountDateRangeFilter({
  className,
  statusOptions,
  statusParam = "status",
}: {
  className?: string;
  /** When set, shows a Status select that writes `statusParam` to the URL. */
  statusOptions?: ReadonlyArray<{ value: string; label: string }>;
  statusParam?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseAccountDateRange(searchParams.get("range"));
  const urlFrom = searchParams.get("from") ?? "";
  const urlTo = searchParams.get("to") ?? "";
  const rawStatus = searchParams.get(statusParam) ?? "all";

  const [customFrom, setCustomFrom] = useState(urlFrom);
  const [customTo, setCustomTo] = useState(urlTo);
  const [syncedFrom, setSyncedFrom] = useState(urlFrom);
  const [syncedTo, setSyncedTo] = useState(urlTo);
  if (syncedFrom !== urlFrom || syncedTo !== urlTo) {
    setSyncedFrom(urlFrom);
    setSyncedTo(urlTo);
    setCustomFrom(urlFrom);
    setCustomTo(urlTo);
  }

  function pushParams(next: {
    range?: AccountDateRange;
    from?: string;
    to?: string;
    status?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    const range = next.range ?? current;
    if (range === "all") {
      params.delete("range");
      params.delete("from");
      params.delete("to");
    } else {
      params.set("range", range);
      if (range === "custom") {
        const from = next.from !== undefined ? next.from : customFrom;
        const to = next.to !== undefined ? next.to : customTo;
        if (from) params.set("from", from);
        else params.delete("from");
        if (to) params.set("to", to);
        else params.delete("to");
      } else {
        params.delete("from");
        params.delete("to");
      }
    }

    if (statusOptions) {
      const status =
        next.status !== undefined
          ? next.status
          : (searchParams.get(statusParam) ?? "all");
      if (!status || status === "all") params.delete(statusParam);
      else params.set(statusParam, status);
    }

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onRangeChange(next: AccountDateRange) {
    if (next === "custom") {
      pushParams({
        range: "custom",
        from: customFrom || undefined,
        to: customTo || undefined,
      });
      return;
    }
    pushParams({ range: next });
  }

  function applyCustomRange() {
    if (!customFrom && !customTo) return;
    pushParams({
      range: "custom",
      from: customFrom || undefined,
      to: customTo || undefined,
    });
  }

  const resolvedStatus =
    statusOptions?.find(
      (o) => o.value.toUpperCase() === rawStatus.toUpperCase(),
    )?.value ?? "all";

  return (
    <AdminDatePickersProvider>
      <div className={cn(sfCard(), "w-full p-3 sm:p-4", className)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
            <FormControl
              size="small"
              sx={{
                width: { xs: "100%", md: 220 },
                minWidth: { md: 200 },
                flexShrink: 0,
              }}
            >
              <InputLabel id="account-date-range-label" sx={labelSx}>
                Date
              </InputLabel>
              <Select
                labelId="account-date-range-label"
                id="account-date-range"
                label="Date"
                value={current}
                onChange={(e) =>
                  onRangeChange(parseAccountDateRange(String(e.target.value)))
                }
                sx={selectSx}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        backgroundColor: "var(--color-card)",
                        color: "var(--color-foreground)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-default, 0.5rem)",
                        boxShadow:
                          "0 12px 28px color-mix(in srgb, var(--color-foreground) 10%, transparent)",
                      },
                    },
                  },
                }}
              >
                {ACCOUNT_DATE_RANGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {statusOptions ? (
              <FormControl
                size="small"
                sx={{
                  width: { xs: "100%", md: 200 },
                  minWidth: { md: 180 },
                  flexShrink: 0,
                }}
              >
                <InputLabel id="account-status-filter-label" sx={labelSx}>
                  Status
                </InputLabel>
                <Select
                  labelId="account-status-filter-label"
                  id="account-status-filter"
                  label="Status"
                  value={resolvedStatus}
                  onChange={(e) =>
                    pushParams({ status: String(e.target.value) })
                  }
                  sx={selectSx}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          backgroundColor: "var(--color-card)",
                          color: "var(--color-foreground)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-default, 0.5rem)",
                          boxShadow:
                            "0 12px 28px color-mix(in srgb, var(--color-foreground) 10%, transparent)",
                        },
                      },
                    },
                  }}
                >
                  {statusOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}

            {current === "custom" ? (
              <div className="flex w-full flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:items-center">
                <div className="w-full min-[480px]:w-[168px]">
                  <AccountDateField
                    label="From"
                    value={customFrom}
                    onChange={(next) => setCustomFrom(next ?? "")}
                    maxDate={customTo ? dayjs(customTo) : dayjs()}
                  />
                </div>
                <div className="w-full min-[480px]:w-[168px]">
                  <AccountDateField
                    label="To"
                    value={customTo}
                    onChange={(next) => setCustomTo(next ?? "")}
                    minDate={customFrom ? dayjs(customFrom) : undefined}
                    maxDate={dayjs()}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!customFrom && !customTo}
                  className={cn(
                    sfBtn("primary"),
                    "!h-10 !min-h-10 !max-h-10 !w-full !px-5 !text-xs min-[480px]:!w-auto",
                  )}
                >
                  Apply
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminDatePickersProvider>
  );
}
