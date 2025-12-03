import { getPaymentProvider } from "../../services/paymentService.js";

describe("Payment Factory Integration", () => {
    test("Should return Stripe adapter", () => {
        const provider = getPaymentProvider('stripe');
        expect(provider.constructor.name).toBe("StripeAdapter");
    });

    test("Should throw on invalid provider", () => {
        expect(() => getPaymentProvider('crypto')).toThrow("Invalid Payment Provider");
    });
});