// tests/unit/paymentService.factory.test.js
import { getPaymentProvider } from '../../services/paymentService.js';

describe('paymentService factory', () => {
  test('getPaymentProvider throws on unknown provider', () => {
    expect(() => getPaymentProvider('unknown')).toThrow(/Invalid Payment Provider/);
  });

  test('stripe adapter stub returns session when client missing', async () => {
    const p = getPaymentProvider('stripe');
    const out = await p.createOrder({ appointmentId: 'a1', amount: 50 });
    expect(out.provider).toBe('stripe');
    // stub session property should exist in our implementation
    expect(out.session).toBeDefined();
  });

  test('razorpay adapter stub returns order when client missing', async () => {
    const p = getPaymentProvider('razorpay');
    const out = await p.createOrder({ appointmentId: 'x1', amount: 80 });
    expect(out.provider).toBe('razorpay');
    expect(out.order).toBeDefined();
    expect(out.order.receipt).toBe(String('x1'));
  });
});
