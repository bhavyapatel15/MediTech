// tests/unit/paymentService.test.js
import paymentService, { getPaymentProvider, createOrder, verifyRazorpay } from '../../services/paymentService.js';

describe('Payment Service', () => {

  describe('getPaymentProvider', () => {
    it('should return a RazorpayAdapter for "razorpay"', () => {
      const provider = getPaymentProvider('razorpay');
      expect(provider).toHaveProperty('createOrder');
      expect(provider).toHaveProperty('verify');
      expect(provider.client).toBeDefined(); // stub or client
    });

    it('should return a StripeAdapter for "stripe"', () => {
      const provider = getPaymentProvider('stripe');
      expect(provider).toHaveProperty('createOrder');
      expect(provider).toHaveProperty('verify');
      expect(provider.client).toBeDefined(); // stub or client
    });

    it('should throw error for invalid provider', () => {
      expect(() => getPaymentProvider('paypal')).toThrow(/Invalid Payment Provider/i);
    });
  });

  describe('createOrder', () => {
    it('should create a Razorpay stub order when client is null', async () => {
      const provider = getPaymentProvider('razorpay');
      provider.client = null; // force stub
      const result = await provider.createOrder({ appointmentId: '123', amount: 500 });
      expect(result).toHaveProperty('provider', 'razorpay');
      expect(result.order).toHaveProperty('id', 'rzp_test_order_123');
      expect(result.order.amount).toBe(50000);
    });

    it('should throw error if appointmentId is missing', async () => {
      const provider = getPaymentProvider('razorpay');
      provider.client = null;
      await expect(provider.createOrder({ amount: 100 })).rejects.toThrow(/appointmentId is required/i);
    });

    it('should create a Stripe stub session when client is null', async () => {
      const provider = getPaymentProvider('stripe');
      provider.client = null;
      const result = await provider.createOrder({ appointmentId: 'abc', amount: 250 });
      expect(result).toHaveProperty('provider', 'stripe');
      expect(result.session).toHaveProperty('id', 'stripe_test_session_abc');
      expect(result.session.amount).toBe(25000);
    });

    it('createOrder helper should delegate to correct provider', async () => {
      const result = await createOrder({ appointmentId: '555', amount: 100, method: 'razorpay' });
      expect(result.provider).toBe('razorpay');
    });
  });

  describe('verifyRazorpay', () => {
    it('should return verified true when client is null', async () => {
      const provider = getPaymentProvider('razorpay');
      provider.client = null;
      const result = await verifyRazorpay({ some: 'payload' });
      expect(result).toHaveProperty('verified', true);
      expect(result.payload).toEqual({ some: 'payload' });
    });

    it('should call adapter verify method and return payload', async () => {
      const spy = jest.spyOn(paymentService, 'getPaymentProvider');
      const result = await verifyRazorpay({ data: 123 });
      expect(result.verified).toBe(true);
      expect(result.payload).toEqual({ data: 123 });
      spy.mockRestore();
    });
  });

});
