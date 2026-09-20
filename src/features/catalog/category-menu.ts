/** Client-safe category menu helpers (no server-only imports). */

export type CategoryMenuSource = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  imageUrl?: string | null;
};

export type CategoryMenuNode = {
  id: string;
  name: string;
  href: string;
  imageUrl?: string | null;
  children: CategoryMenuNode[];
};

/** Build one-level parent → children tree for Products dropdown. */
export function buildCategoryMenuTree(
  categories: CategoryMenuSource[],
): CategoryMenuNode[] {
  const ids = new Set(categories.map((c) => c.id));
  const childrenByParent = new Map<string, CategoryMenuSource[]>();
  const roots: CategoryMenuSource[] = [];

  for (const cat of categories) {
    if (cat.parent_id && ids.has(cat.parent_id)) {
      const list = childrenByParent.get(cat.parent_id) ?? [];
      list.push(cat);
      childrenByParent.set(cat.parent_id, list);
    } else {
      roots.push(cat);
    }
  }

  function toNode(cat: CategoryMenuSource): CategoryMenuNode {
    const kids = childrenByParent.get(cat.id) ?? [];
    return {
      id: cat.id,
      name: cat.name,
      href: `/categories/${cat.slug}`,
      imageUrl: cat.imageUrl ?? null,
      children: kids.map(toNode),
    };
  }

  return roots.map(toNode);
}

export function isProductsNavHref(href: string): boolean {
  const path = href.split("?")[0]?.replace(/\/+$/, "") || "/";
  return path === "/products";
}
