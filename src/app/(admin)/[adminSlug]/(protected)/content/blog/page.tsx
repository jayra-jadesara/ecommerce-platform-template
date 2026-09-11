import Link from "next/link";
import Alert from "@mui/material/Alert";
import { requirePermission, hasPermission } from "@/features/auth/session";
import { getAdminPath } from "@/config/admin-route";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { BlogCategoriesPanel } from "@/features/blog/components/BlogCategoriesPanel";
import { BlogPostForm } from "@/features/blog/components/BlogPostForm";
import { BlogPostsTable } from "@/features/blog/components/BlogPostsTable";
import { BlogSettingsForm } from "@/features/blog/components/BlogSettingsForm";
import {
  listAdminBlogCategories,
  listAdminBlogCategoriesWithCounts,
} from "@/features/blog/categories-service";
import {
  getAdminBlogPost,
  listAdminBlogPosts,
  listBlogProductOptions,
  toBlogPostFormValues,
} from "@/features/blog/posts-service";
import {
  DEFAULT_BLOG_POST_FORM,
  DEFAULT_BLOG_SETTINGS,
} from "@/features/blog/schemas";
import {
  loadAdminBlogSettings,
  listPublishedBlogPostOptions,
  toBlogSettingsFormValues,
} from "@/features/blog/settings-service";

export const dynamic = "force-dynamic";

type Panel = "list" | "new" | "edit" | "categories" | "settings";

function parsePanel(value: string | undefined): Panel {
  if (
    value === "new" ||
    value === "edit" ||
    value === "categories" ||
    value === "settings"
  ) {
    return value;
  }
  return "list";
}

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requirePermission("blog.view");
  const params = await searchParams;
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value[0]) flat[key] = value[0];
  }

  const panel = parsePanel(flat.panel);
  const listHref = getAdminPath("/content/blog");
  const canCreate = hasPermission(admin, "blog.create");
  const canUpdate = hasPermission(admin, "blog.update");
  const canPublish = hasPermission(admin, "blog.publish");
  const canDelete = hasPermission(admin, "blog.delete");

  if (panel === "new") {
    if (!canCreate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Create article" />
          <Alert severity="warning">
            You don’t have permission to create articles.{" "}
            <Link href={listHref} className="underline">
              Back
            </Link>
          </Alert>
        </div>
      );
    }

    const [categories, productOptions] = await Promise.all([
      listAdminBlogCategories(),
      listBlogProductOptions(),
    ]);

    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title="Create article"
          description="Write a story your customers can read on your store blog."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Blog", href: listHref },
            { label: "Create" },
          ]}
        />
        <BlogPostForm
          mode="create"
          initialValues={DEFAULT_BLOG_POST_FORM}
          categories={categories}
          productOptions={productOptions}
          canSubmit={canCreate}
        />
      </div>
    );
  }

  if (panel === "edit") {
    if (!canUpdate) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Edit article" />
          <Alert severity="warning">
            You don’t have permission to edit articles.{" "}
            <Link href={listHref} className="underline">
              Back
            </Link>
          </Alert>
        </div>
      );
    }

    const post = flat.id ? await getAdminBlogPost(flat.id) : null;
    if (!post) {
      return (
        <div className="space-y-4">
          <AdminPageHeader title="Edit article" />
          <Alert severity="error">
            Article not found.{" "}
            <Link href={listHref} className="underline">
              Back
            </Link>
          </Alert>
        </div>
      );
    }

    const [categories, productOptions] = await Promise.all([
      listAdminBlogCategories(),
      listBlogProductOptions(),
    ]);

    return (
      <div className="space-y-4 pb-16">
        <AdminPageHeader
          title={`Edit ${post.title}`}
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Blog", href: listHref },
            { label: post.title },
          ]}
        />
        <BlogPostForm
          mode="edit"
          postId={post.id}
          initialValues={toBlogPostFormValues(post)}
          categories={categories}
          productOptions={productOptions}
          canSubmit={canUpdate}
        />
      </div>
    );
  }

  if (panel === "categories") {
    const categories = await listAdminBlogCategoriesWithCounts();
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Blog categories"
          description="Organize articles by topic. Reorder with Up / Down."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Blog", href: listHref },
            { label: "Categories" },
          ]}
        />
        <BlogCategoriesPanel
          categories={categories}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      </div>
    );
  }

  if (panel === "settings") {
    const [settings, featuredOptions] = await Promise.all([
      loadAdminBlogSettings(),
      listPublishedBlogPostOptions(),
    ]);
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title="Blog settings"
          description="Shape your branded journal — layout, sidebar, sharing, and article extras."
          breadcrumbs={[
            { label: "Content", href: getAdminPath("/content") },
            { label: "Blog", href: listHref },
            { label: "Settings" },
          ]}
        />
        <BlogSettingsForm
          initialValues={
            settings
              ? toBlogSettingsFormValues(settings)
              : DEFAULT_BLOG_SETTINGS
          }
          canUpdate={canUpdate}
          featuredOptions={featuredOptions}
        />
      </div>
    );
  }

  const [listed, categories] = await Promise.all([
    listAdminBlogPosts(flat),
    listAdminBlogCategories(),
  ]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Blog"
        description="Share stories, ideas and useful content with your customers."
        breadcrumbs={[
          { label: "Content", href: getAdminPath("/content") },
          { label: "Blog" },
        ]}
      />
      <BlogPostsTable
        items={listed.items}
        total={listed.total}
        query={listed.query}
        categories={categories}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canPublish={canPublish}
        canDelete={canDelete}
      />
    </div>
  );
}
