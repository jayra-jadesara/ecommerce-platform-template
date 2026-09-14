import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";

export const MEDIA_FOLDER_LABELS: Record<MediaFolder, string> = {
  general: "General library",
  cms: "Homepage & pages",
  products: "Products",
  categories: "Categories",
  branding: "Logo & branding",
};

export const MEDIA_FOLDER_HINTS: Record<MediaFolder, string> = {
  general: "Private admin library — signed previews in admin only.",
  cms: "Banners, homepage, and page images (public on the store).",
  products: "Product photos",
  categories: "Category images",
  branding: "Logo, favicon, social image",
};

export type MediaFolderFilter = MediaFolder | "all";

export const MEDIA_FOLDER_NAV: { id: MediaFolderFilter; label: string }[] = [
  { id: "all", label: "All folders" },
  ...MEDIA_FOLDERS.map((id) => ({
    id,
    label: MEDIA_FOLDER_LABELS[id],
  })),
];

export function resolveMediaUploadFolder(
  folder: MediaFolderFilter,
): MediaFolder {
  return folder === "all" ? "cms" : folder;
}

export function mediaFolderLabel(folder: string | null | undefined): string {
  if (!folder) return MEDIA_FOLDER_LABELS.general;
  if (folder in MEDIA_FOLDER_LABELS) {
    return MEDIA_FOLDER_LABELS[folder as MediaFolder];
  }
  return folder;
}
