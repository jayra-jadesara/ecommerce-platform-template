import { describe, expect, it } from "vitest";
import { FreeShippingProgress } from "@/features/cart/components/FreeShippingProgress";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("phase 23 free shipping progress", () => {
  it("hides when threshold is missing", () => {
    const html = renderToStaticMarkup(
      createElement(FreeShippingProgress, {
        subtotalMajor: 500,
        currency: "INR",
        thresholdMajor: null,
      }),
    );
    expect(html).toBe("");
  });

  it("shows remaining amount toward free delivery", () => {
    const html = renderToStaticMarkup(
      createElement(FreeShippingProgress, {
        subtotalMajor: 630,
        currency: "INR",
        thresholdMajor: 750,
        shippingEnabled: true,
      }),
    );
    expect(html).toContain("Add");
    expect(html).toContain("more to unlock free delivery");
    expect(html).toContain("Free delivery above");
  });

  it("shows unlocked state when threshold is met", () => {
    const html = renderToStaticMarkup(
      createElement(FreeShippingProgress, {
        subtotalMajor: 800,
        currency: "INR",
        thresholdMajor: 750,
      }),
    );
    expect(html).toContain("Free delivery unlocked");
  });
});
