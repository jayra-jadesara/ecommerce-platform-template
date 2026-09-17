"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

export type StorefrontSelectOption = {
  value: string;
  label: string;
};

type StorefrontSelectProps = {
  options: ReadonlyArray<StorefrontSelectOption>;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  fallbackOption?: StorefrontSelectOption | null;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
};

/**
 * Themed storefront select with custom menu (native &lt;option&gt; lists cannot use brand colors).
 */
export function StorefrontSelect({
  options,
  value = "",
  onChange,
  error,
  fallbackOption,
  emptyLabel,
  className,
  disabled,
  id,
  name,
  required,
  "aria-label": ariaLabel,
}: StorefrontSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const allOptions: StorefrontSelectOption[] = [];
  if (emptyLabel !== undefined) {
    allOptions.push({ value: "", label: emptyLabel });
  }
  for (const opt of options) allOptions.push(opt);
  if (
    fallbackOption &&
    !allOptions.some((o) => o.value === fallbackOption.value)
  ) {
    allOptions.push(fallbackOption);
  }

  const selected =
    allOptions.find((o) => o.value === value) ??
    (emptyLabel !== undefined
      ? { value: "", label: emptyLabel }
      : allOptions[0]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = allOptions.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reopen syncs to current value only
  }, [open, value]);

  function pick(next: string) {
    onChange?.(next);
    setOpen(false);
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(allOptions.length - 1, Math.max(0, i) + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const opt = allOptions[activeIndex];
      if (opt) pick(opt.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("sf-select", open && "sf-select--open", className)}
    >
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          "sf-field sf-select__trigger",
          error && "sf-field--error",
          !value && "sf-select__trigger--placeholder",
        )}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="sf-select__value">{selected?.label ?? ""}</span>
        <span className="sf-select__chevron" aria-hidden />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="sf-select__menu"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
          onKeyDown={onListKeyDown}
        >
          {allOptions.map((opt, index) => {
            const isSelected = opt.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={`${opt.value}-${opt.label}-${index}`}
                id={`${listId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "sf-select__option",
                  isSelected && "sf-select__option--selected",
                  isActive && "sf-select__option--active",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt.value);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
