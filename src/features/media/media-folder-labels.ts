import { MEDIA_FOLDERS, type MediaFolder } from "@/features/media/validation";

/** Short labels — match Content sidebar names where possible. */
export const MEDIA_FOLDER_LABELS: Record<MediaFolder, string> = {
  products: "Products",
  categories: "Categories",
  branding: "Branding",
  cms: "Homepage & pages",
  about: "About",
  contact: "Contact",
  career: "Career",
  banners: "Banners",
  blog: "Blog",
  general: "Library",
};

/**
 * Compact upload / rail hints.
 * Explains which store feature uses this folder.
 */
export const MEDIA_FOLDER_HINTS: Record<MediaFolder, string> = {
  products: "Product gallery & variants",
  categories: "Category covers & icons",
  branding: "Logo, favicon, store marks",
  cms: "Homepage, legal & custom pages",
  about: "About page (Content → About)",
  contact: "Contact page (Content → Contact)",
  career: "Career page (Content → Career)",
  banners: "Promo slides (Content → Banners)",
  blog: "Posts & covers (Content → Blog)",
  general: "Shared / uncategorized files",
};

/** Longer copy for Images & Files header / empty states. */
export const MEDIA_FOLDER_LIBRARY_DESCRIPTIONS: Record<
  MediaFolder | "all",
  string
> = {
  all: "Central library for every upload. Folders mirror Content pages (Contact, About, Career…), catalog, branding, and banners — same folders as the image picker popup.",
  products: "Images used on product cards and product detail pages.",
  categories: "Images used for shop category tiles and headers.",
  branding: "Store logo, favicon, and brand assets from Store Settings.",
  cms: "Homepage sections, legal pages, and custom CMS page media.",
  about: "Media for the About page (Content → About).",
  contact: "Media for the Contact page (Content → Contact).",
  career: "Media for the Career page (Content → Career).",
  banners: "Images for homepage / promo banners (Content → Banners).",
  blog: "Featured images and inline media for Blog posts.",
  general: "Files not tied to a specific page — shared across the admin.",
};

export type MediaFolderFilter = MediaFolder | "all";

export type MediaFolderNavGroup = {
  id: string;
  label: string;
  folders: MediaFolder[];
};

/**
 * Groups mirror admin Content: catalog, page-wise content, store branding, shared.
 * Used by Images & Files and the Choose-an-image popup.
 */
export const MEDIA_FOLDER_NAV_GROUPS: MediaFolderNavGroup[] = [
  {
    id: "catalog",
    label: "Catalog",
    folders: ["products", "categories"],
  },
  {
    id: "content",
    label: "Content pages",
    folders: ["cms", "about", "contact", "career", "banners", "blog"],
  },
  {
    id: "store",
    label: "Store",
    folders: ["branding"],
  },
  {
    id: "shared",
    label: "Shared",
    folders: ["general"],
  },
];

/** Flat list for selects / legacy consumers (All + every folder). */
export const MEDIA_FOLDER_NAV: { id: MediaFolderFilter; label: string }[] = [
  { id: "all", label: "All folders" },
  ...MEDIA_FOLDERS.map((id) => ({
    id,
    label: MEDIA_FOLDER_LABELS[id],
  })),
];

/** When browsing “All”, new uploads land in Homepage & pages by default. */
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

export function mediaFolderHint(folder: MediaFolder): string {
  return MEDIA_FOLDER_HINTS[folder];
}

export function mediaFolderLibraryDescription(
  folder: MediaFolder | "all",
): string {
  return MEDIA_FOLDER_LIBRARY_DESCRIPTIONS[folder];
}
