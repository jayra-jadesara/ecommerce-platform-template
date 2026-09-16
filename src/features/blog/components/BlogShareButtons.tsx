"use client";

import { ShareActions, type ShareProfileLinks } from "@/components/ui/ShareActions";

type BlogShareButtonsProps = {
  url: string;
  title: string;
  className?: string;
  profiles?: ShareProfileLinks;
};

/** Blog article share row — delegates to shared ShareActions. */
export function BlogShareButtons({
  url,
  title,
  className,
  profiles,
}: BlogShareButtonsProps) {
  return (
    <ShareActions
      url={url}
      title={title}
      className={className}
      profiles={profiles}
    />
  );
}
