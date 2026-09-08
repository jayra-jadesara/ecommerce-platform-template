import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "article";
  /** When true, skip horizontal padding (edge-to-edge sections). */
  flush?: boolean;
}

/**
 * Full-width page container. Side padding only — no artificial max-width
 * that leaves empty left/right gutters on wide screens.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  flush = false,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "w-full",
        !flush && "px-[var(--layout-container-padding)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
