"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<typeof Button>;

interface LinkButtonProps extends Omit<ButtonProps, "href" | "LinkComponent"> {
  href: string;
  children: ReactNode;
}

/** MUI Button wired to Next.js Link without illegal RSC function props. */
export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  return (
    <Button href={href} LinkComponent={Link} {...props}>
      {children}
    </Button>
  );
}
