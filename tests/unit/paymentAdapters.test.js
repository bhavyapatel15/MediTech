import { getPaymentProvider } from '../../services/paymentService.js';
test('getPaymentProvider throws on invalid', () => {
  expect(() => getPaymentProvider('unknown')).toThrow(/Invalid Payment Provider/);
});
test('stripe adapter createOrder returns test session when client missing', async () => {
  const provider = getPaymentProvider('stripe');
  const out = await provider.createOrder({ appointmentId: 'a1', amount: 100 });
  expect(out.provider).toBe('stripe');
  expect(out.session.id).toMatch(/stripe_test_session/);
});
