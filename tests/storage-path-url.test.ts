import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  inferStorageBucket,
  resolvePublicStorageUrl,
  resolveStoragePathUrl,
} from "@/lib/supabase/storage-url";

describe("resolveStoragePathUrl", () => {
  const prev = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = prev;
  });

  it("infers cms bucket from path prefix", () => {
    expect(inferStorageBucket("cms/store/library/a.jpg")).toBe("cms");
  });

  it("builds cms public URL for cms library paths", () => {
    const path = "cms/bdb98e1f-1060-4186-a679-80e24a93638e/library/dcf5fc94.jpg";
    const url = resolveStoragePathUrl(path);
    expect(url).toBe(
      `https://example.supabase.co/storage/v1/object/public/cms/${path}`,
    );
    expect(url).not.toContain("/public/media/cms/");
  });

  it("does not fall through when resolvePublicStorageUrl always returns", () => {
    const path = "cms/store/library/x.jpg";
    const wrong = resolvePublicStorageUrl("media", path);
    const right = resolveStoragePathUrl(path);
    expect(wrong).toContain("/public/media/cms/");
    expect(right).toContain("/public/cms/cms/");
  });
});
