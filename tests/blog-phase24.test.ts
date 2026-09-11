import { describe, expect, it } from "vitest";
import { slugify } from "@/features/catalog/slug";
import { hasPermission, ROLE_PERMISSIONS } from "@/features/auth/permissions";
import { ADMIN_NAV_TREE } from "@/features/admin/nav";
import { getAdminPath } from "@/config/admin-route";
import { STORE_PAGE_OPTIONS } from "@/features/admin/ui/StorePageLinkField";
import { defaultPlatformConfig } from "@/config/defaults";
import {
  blogCategoryFormSchema,
  blogPostFormSchema,
  blogSettingsFormSchema,
  blogListQuerySchema,
  DEFAULT_BLOG_POST_FORM,
  DEFAULT_BLOG_SETTINGS,
} from "@/features/blog/schemas";
import {
  stripUnsafeContent,
  estimateReadingMinutes,
  isPubliclyVisiblePost,
} from "@/features/blog/sanitize";
import {
  resolveBlogListingSeo,
  resolveBlogPostSeo,
} from "@/features/seo/resolve";
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
} from "@/features/seo/json-ld";
import { shouldIncludeInSitemap } from "@/features/seo/sitemap-rules";
import { paginationWindow } from "@/features/blog/components/BlogPagination";
describe("blog permissions", () => {
  it("grants ADMIN all blog permissions including delete", () => {
    expect(hasPermission(["ADMIN"], "blog.view")).toBe(true);
    expect(hasPermission(["ADMIN"], "blog.create")).toBe(true);
    expect(hasPermission(["ADMIN"], "blog.update")).toBe(true);
    expect(hasPermission(["ADMIN"], "blog.delete")).toBe(true);
    expect(hasPermission(["ADMIN"], "blog.publish")).toBe(true);
  });

  it("grants EDITOR view/create/update/publish but not delete", () => {
    expect(hasPermission(["EDITOR"], "blog.view")).toBe(true);
    expect(hasPermission(["EDITOR"], "blog.create")).toBe(true);
    expect(hasPermission(["EDITOR"], "blog.update")).toBe(true);
    expect(hasPermission(["EDITOR"], "blog.publish")).toBe(true);
    expect(hasPermission(["EDITOR"], "blog.delete")).toBe(false);
    expect(ROLE_PERMISSIONS.EDITOR.includes("blog.delete")).toBe(false);
  });

  it("denies ORDER_MANAGER all blog permissions", () => {
    expect(hasPermission(["ORDER_MANAGER"], "blog.view")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "blog.create")).toBe(false);
    expect(hasPermission(["ORDER_MANAGER"], "blog.publish")).toBe(false);
  });
});

describe("blog navigation", () => {
  it("includes Blog under Content admin nav", () => {
    const content = ADMIN_NAV_TREE.find(
      (entry) => entry.kind === "group" && entry.id === "content",
    );
    expect(content?.kind).toBe("group");
    if (content?.kind !== "group") return;
    const blog = content.children.find((c) => c.id === "content-blog");
    expect(blog?.href).toBe(getAdminPath("/content/blog"));
    expect(blog?.permissions).toContain("blog.view");
  });

  it("exposes /blog in store page link options", () => {
    expect(STORE_PAGE_OPTIONS.some((o) => o.value === "/blog")).toBe(true);
  });

  it("includes Blog in default storefront navigation", () => {
    expect(
      defaultPlatformConfig.navigation.primary.some((i) => i.href === "/blog"),
    ).toBe(true);
  });
});

describe("blog post validation", () => {
  it("accepts a valid draft post", () => {
    const result = blogPostFormSchema.safeParse({
      ...DEFAULT_BLOG_POST_FORM,
      title: "How to cook with spices",
      slug: "how-to-cook-with-spices",
      excerpt: "A short guide.",
      content: "## Hello\n\nSome **bold** text.",
      status: "draft",
    });
    expect(result.success).toBe(true);
  });

  it("auto-generates slug from title when slug empty", () => {
    const result = blogPostFormSchema.safeParse({
      ...DEFAULT_BLOG_POST_FORM,
      title: "Fresh Ginger Tea",
      slug: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe(slugify("Fresh Ginger Tea"));
    }
  });

  it("rejects unsafe script content", () => {
    const result = blogPostFormSchema.safeParse({
      ...DEFAULT_BLOG_POST_FORM,
      title: "Bad",
      slug: "bad",
      content: '<script>alert(1)</script>\nHello',
    });
    expect(result.success).toBe(false);
  });

  it("rejects javascript: URLs in content", () => {
    const result = blogPostFormSchema.safeParse({
      ...DEFAULT_BLOG_POST_FORM,
      title: "Bad link",
      slug: "bad-link",
      content: "[click](javascript:alert(1))",
    });
    expect(result.success).toBe(false);
  });
});

describe("blog category validation", () => {
  it("accepts a valid category", () => {
    const result = blogCategoryFormSchema.safeParse({
      name: "Recipes",
      slug: "recipes",
      description: "Cooking ideas",
      imagePath: null,
      isActive: true,
      sortOrder: 0,
    });
    expect(result.success).toBe(true);
  });

  it("slugifies name when slug blank", () => {
    const result = blogCategoryFormSchema.safeParse({
      name: "Cooking Tips",
      slug: "",
      isActive: true,
      sortOrder: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("cooking-tips");
    }
  });
});

describe("blog settings validation", () => {
  it("accepts defaults", () => {
    expect(blogSettingsFormSchema.safeParse(DEFAULT_BLOG_SETTINGS).success).toBe(
      true,
    );
  });

  it("rejects invalid layout preset", () => {
    expect(
      blogSettingsFormSchema.safeParse({
        ...DEFAULT_BLOG_SETTINGS,
        layoutPreset: "CUSTOM",
      }).success,
    ).toBe(false);
  });
});

describe("blog list query", () => {
  it("parses filters", () => {
    const result = blogListQuerySchema.safeParse({
      q: "spice",
      status: "published",
      featured: "yes",
      page: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.featured).toBe("yes");
    }
  });
});

describe("blog sanitize helpers", () => {
  it("strips script tags and event handlers", () => {
    const cleaned = stripUnsafeContent(
      '<script>evil()</script>Hello <img src="x" onerror="alert(1)">',
    );
    expect(cleaned.toLowerCase()).not.toContain("<script");
    expect(cleaned.toLowerCase()).not.toContain("onerror");
    expect(cleaned).toContain("Hello");
  });

  it("strips javascript: protocol", () => {
    expect(stripUnsafeContent("[x](javascript:alert(1))")).not.toMatch(
      /javascript\s*:/i,
    );
  });

  it("estimates reading time", () => {
    expect(estimateReadingMinutes("")).toBe(0);
    expect(estimateReadingMinutes("one two three")).toBe(1);
    const words = Array.from({ length: 450 }, () => "word").join(" ");
    expect(estimateReadingMinutes(words)).toBe(3);
  });

  it("excludes drafts and archived from public visibility", () => {
    expect(isPubliclyVisiblePost("draft", null)).toBe(false);
    expect(isPubliclyVisiblePost("archived", null)).toBe(false);
  });

  it("includes published without date", () => {
    expect(isPubliclyVisiblePost("published", null)).toBe(true);
  });

  it("excludes future published_at", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isPubliclyVisiblePost("published", future)).toBe(false);
  });

  it("includes past published_at", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isPubliclyVisiblePost("published", past)).toBe(true);
  });
});

describe("blog SEO", () => {
  const seo = defaultPlatformConfig.seo;

  it("resolves listing metadata", () => {
    const resolved = resolveBlogListingSeo({
      settings: {
        pageTitle: "Journal",
        pageDescription: "Stories from our kitchen.",
      },
      seo,
    });
    expect(resolved.canonicalPath).toBe("/blog");
    expect(resolved.title).toContain("Journal");
    expect(resolved.ogType).toBe("website");
  });

  it("resolves post metadata with fallbacks", () => {
    const resolved = resolveBlogPostSeo({
      post: {
        title: "Masala Guide",
        slug: "masala-guide",
        excerpt: "Learn the basics.",
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        status: "published",
      },
      seo,
    });
    expect(resolved.canonicalPath).toBe("/blog/masala-guide");
    expect(resolved.title).toBe("Masala Guide");
    expect(resolved.description).toBe("Learn the basics.");
    expect(resolved.ogType).toBe("article");
    expect(resolved.robotsIndex).toBe(true);
  });

  it("does not index draft posts", () => {
    const resolved = resolveBlogPostSeo({
      post: {
        title: "Draft",
        slug: "draft",
        excerpt: null,
        seoTitle: null,
        seoDescription: null,
        ogImageUrl: null,
        status: "draft",
      },
      seo,
    });
    expect(resolved.robotsIndex).toBe(false);
  });

  it("builds BlogPosting JSON-LD without inventing fields", () => {
    const ld = buildBlogPostingJsonLd({
      title: "Title",
      description: "Desc",
      slug: "title",
      imageUrl: "https://cdn.example.com/a.jpg",
      datePublished: "2026-01-01T00:00:00.000Z",
      dateModified: "2026-01-02T00:00:00.000Z",
      authorName: "Editorial Team",
    });
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.headline).toBe("Title");
    expect(ld.author).toEqual({ "@type": "Person", name: "Editorial Team" });
  });

  it("builds breadcrumb JSON-LD", () => {
    const ld = buildBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: "Article", path: "/blog/article" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect((ld.itemListElement as unknown[]).length).toBe(3);
  });
});

describe("blog sitemap rules", () => {
  it("includes published blog posts only", () => {
    expect(shouldIncludeInSitemap({ kind: "blog", status: "published" })).toBe(
      true,
    );
    expect(shouldIncludeInSitemap({ kind: "blog", status: "draft" })).toBe(
      false,
    );
    expect(shouldIncludeInSitemap({ kind: "blog", status: "archived" })).toBe(
      false,
    );
  });
});

describe("blog pagination window", () => {
  it("returns empty when only one page", () => {
    expect(paginationWindow(1, 1)).toEqual([]);
  });

  it("clamps a five-page window around the current page", () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(paginationWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it("shrinks when total pages are fewer than the window", () => {
    expect(paginationWindow(2, 3)).toEqual([1, 2, 3]);
  });
});
