import { describe, expect, it } from "vitest";
import {
  coercePaymentInstrument,
  formatPaymentInstrumentLabel,
  parseRazorpayInstrument,
} from "@/features/payments/razorpay-instrument";

describe("parseRazorpayInstrument", () => {
  it("parses card credit + last4 + network", () => {
    const parsed = parseRazorpayInstrument({
      method: "card",
      card: {
        type: "credit",
        last4: "4242",
        network: "Visa",
        issuer: "HDFC",
      },
    });
    expect(parsed.method).toBe("card");
    expect(parsed.instrument).toMatchObject({
      method: "card",
      cardType: "credit",
      last4: "4242",
      network: "Visa",
      issuer: "HDFC",
      vpa: null,
    });
  });

  it("parses UPI VPA", () => {
    const parsed = parseRazorpayInstrument({
      method: "upi",
      upi: { vpa: "buyer@oksbi" },
    });
    expect(parsed.instrument?.vpa).toBe("buyer@oksbi");
    expect(formatPaymentInstrumentLabel(parsed.instrument)).toBe(
      "UPI · buyer@oksbi",
    );
  });

  it("parses netbanking bank string", () => {
    const parsed = parseRazorpayInstrument({
      method: "netbanking",
      bank: "HDFC",
    });
    expect(parsed.instrument?.bank).toBe("HDFC");
  });

  it("parses wallet string", () => {
    const parsed = parseRazorpayInstrument({
      method: "wallet",
      wallet: "paytm",
    });
    expect(parsed.instrument?.wallet).toBe("paytm");
  });

  it("coerces metadata.instrument", () => {
    expect(
      coercePaymentInstrument({
        addressId: "x",
        instrument: {
          method: "upi",
          cardType: null,
          last4: null,
          network: null,
          vpa: "a@upi",
          bank: null,
          wallet: null,
          issuer: null,
        },
      })?.vpa,
    ).toBe("a@upi");
  });
});
