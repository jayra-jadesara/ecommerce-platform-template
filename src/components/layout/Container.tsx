import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "article";
  /** When true, skip horizontal padding (edge-to-edge sections). */
  flush?: boolean;
  /** When false, allow full viewport width (rare). Default constrains readable width. */
  constrained?: boolean;
}

/**
 * Storefront page container — centered content width with responsive padding.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  flush = false,
  constrained = true,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "w-full",
        constrained && "mx-auto max-w-[var(--layout-content-max,1520px)]",
        !flush && "px-[var(--layout-container-padding)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
