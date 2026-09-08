import type { PageStatus } from "@/types/database";
import type {
  SectionConfigMap,
  SupportedSectionType,
} from "@/features/cms/schemas";

export type ContentPage = {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  content: string | null;
  status: PageStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImagePath: string | null;
  ogImagePath: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentSection = {
  id: string;
  pageId: string;
  sectionType: SupportedSectionType | "custom" | string;
  title: string | null;
  sortOrder: number;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ParsedContentSection<T extends SupportedSectionType = SupportedSectionType> = {
  id: string;
  pageId: string;
  sectionType: T;
  title: string | null;
  sortOrder: number;
  isActive: boolean;
  config: SectionConfigMap[T];
};

export type BannerRow = {
  id: string;
  storeId: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
