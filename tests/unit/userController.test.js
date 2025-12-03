// tests/unit/userController.test.js
/**
 * Unit tests for backend/controllers/userController.js
 *
 * - Mocks the userService functions called by the controller.
 * - Asserts both happy paths and error mapping (mapErrorStatus).
 *
 * Place this in: tests/unit/userController.test.js
 */

jest.mock('../../services/userService.js');

import * as userService from '../../services/userService.js';
import * as userController from '../../controllers/userController.js';

function makeReq(body = {}, user = null, file = null, query = {}) {
  const req = { body: { ...body }, query: { ...query }, file: file || undefined };
  if (user) req.user = user;
  return req;
}

function makeRes() {
  let statusCode = 200;
  let sent = null;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) { sent = obj; return this; },
    _getStatus() { return statusCode; },
    _getJSON() { return sent; }
  };
}

describe('userController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('registerUser - success returns 201 and data', async () => {
    const payload = { name: 'A', email: 'a@test.com', password: 'pass' };
    userService.registerUser.mockResolvedValue({ userId: 'u1', token: 'tok' });

    const req = makeReq(payload);
    const res = makeRes();

    await userController.registerUser(req, res);

    expect(userService.registerUser).toHaveBeenCalledWith(payload);
    expect(res._getStatus()).toBe(201);
    expect(res._getJSON().success).toBe(true);
    expect(res._getJSON().data).toEqual({ userId: 'u1', token: 'tok' });
  });

  test('loginUser - success returns token in data', async () => {
    userService.loginUser.mockResolvedValue('the-token');

    const req = makeReq({ email: 'a', password: 'p' });
    const res = makeRes();
    await userController.loginUser(req, res);

    expect(userService.loginUser).toHaveBeenCalledWith({ email: 'a', password: 'p' });
    expect(res._getJSON().data.token).toBe('the-token');
  });

  test('getProfile - success returns profile', async () => {
    const fakeProfile = { _id: 'u1', name: 'A' };
    userService.getProfile.mockResolvedValue(fakeProfile);

    const req = makeReq({}, { id: 'u1' });
    const res = makeRes();

    await userController.getProfile(req, res);

    expect(userService.getProfile).toHaveBeenCalledWith('u1');
    expect(res._getJSON().data).toBe(fakeProfile);
  });

  test('updateProfile - success returns message', async () => {
    userService.updateProfile.mockResolvedValue(undefined);

    const req = makeReq({ name: 'new' }, { id: 'u1' }, { originalname: 'x.jpg' });
    const res = makeRes();

    await userController.updateProfile(req, res);

    // service receives userId and payload including file
    expect(userService.updateProfile).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'new', file: req.file }));
    expect(res._getJSON().message).toMatch(/Profile Updated/i);
  });

  test('bookAppointment - success returns 201 and appointment', async () => {
    const appt = { _id: 'a1' };
    userService.bookAppointment.mockResolvedValue(appt);

    const req = makeReq({ doctorId: 'd1', slotDate: '2025-12-20', slotTime: '10:00' }, { id: 'u1' });
    const res = makeRes();
    await userController.bookAppointment(req, res);

    expect(userService.bookAppointment).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    expect(res._getStatus()).toBe(201);
    expect(res._getJSON().data).toBe(appt);
  });

  test('listAppointment - success returns list', async () => {
    const arr = [{ _id: 'a1' }];
    userService.listAppointments.mockResolvedValue(arr);

    const req = makeReq({}, { id: 'u1' });
    const res = makeRes();

    await userController.listAppointment(req, res);

    expect(userService.listAppointments).toHaveBeenCalledWith('u1');
    expect(res._getJSON().data).toBe(arr);
  });

  test('cancelAppointment - success returns message', async () => {
    userService.cancelAppointment.mockResolvedValue(undefined);

    const req = makeReq({ appointmentId: 'a1' }, { id: 'u1' });
    const res = makeRes();

    await userController.cancelAppointment(req, res);

    expect(userService.cancelAppointment).toHaveBeenCalledWith({ userId: 'u1', appointmentId: 'a1' });
    expect(res._getJSON().message).toMatch(/Appointment cancelled/i);
  });

  test('paymentRazorpay - delegates to service and returns data', async () => {
    const out = { provider: 'razor', order: { id: 'o1' } };
    userService.createRazorpayOrder.mockResolvedValue(out);

    const req = makeReq({ appointmentId: 'a1' }, { id: 'u1' });
    const res = makeRes();
    await userController.paymentRazorpay(req, res);

    expect(userService.createRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', appointmentId: 'a1' }));
    expect(res._getJSON().data).toBe(out);
  });

  test('verifyRazorpay - delegates to service and returns data', async () => {
    const out = { verified: true };
    userService.verifyRazorpayWebhook.mockResolvedValue(out);

    const req = makeReq({ some: 'payload' });
    const res = makeRes();
    await userController.verifyRazorpay(req, res);

    expect(userService.verifyRazorpayWebhook).toHaveBeenCalledWith({ some: 'payload' });
    expect(res._getJSON().data).toBe(out);
  });

  test('paymentStripe & verifyStripe - delegates to service', async () => {
    const sess = { id: 's' };
    userService.createStripePayment.mockResolvedValue(sess);
    userService.verifyStripeWebhook.mockResolvedValue({ ok: true });

    const payReq = makeReq({ x: 1 }, { id: 'u1' });
    const res1 = makeRes();
    await userController.paymentStripe(payReq, res1);
    expect(userService.createStripePayment).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }));
    expect(res1._getJSON().data).toBe(sess);

    const verReq = makeReq({ y: 2 });
    const res2 = makeRes();
    await userController.verifyStripe(verReq, res2);
    expect(userService.verifyStripeWebhook).toHaveBeenCalledWith({ y: 2 });
    expect(res2._getJSON().data).toEqual({ ok: true });
  });

  test('getDoctors - delegates and returns list', async () => {
    const doctors = [{ name: 'd' }];
    userService.getDoctors.mockResolvedValue(doctors);

    const req = makeReq({}, null, null, { specialty: 'gen' });
    const res = makeRes();
    await userController.getDoctors(req, res);

    expect(userService.getDoctors).toHaveBeenCalledWith({ specialty: 'gen' });
    expect(res._getJSON().data).toBe(doctors);
  });

  // --- Error mapping: ensure controller maps messages -> status codes via mapErrorStatus ---

  test('error mapping: returns 400 on invalid input message', async () => {
    const err = new Error('Invalid email provided');
    userService.registerUser.mockRejectedValue(err);

    const req = makeReq({ email: 'bad' });
    const res = makeRes();
    await userController.registerUser(req, res);

    expect(res._getStatus()).toBe(400);
    expect(res._getJSON().message).toMatch(/Invalid email provided/);
  });

  test('error mapping: returns 401 on unauthorized message', async () => {
    const err = new Error('Unauthorized: token missing');
    userService.loginUser.mockRejectedValue(err);

    const req = makeReq({ email: 'a' });
    const res = makeRes();
    await userController.loginUser(req, res);

    expect(res._getStatus()).toBe(401);
    expect(res._getJSON().message).toMatch(/Unauthorized/);
  });

  test('error mapping: returns 403 on forbidden message', async () => {
    const err = new Error('Forbidden: not allowed');
    userService.getProfile.mockRejectedValue(err);

    const req = makeReq({}, { id: 'u1' });
    const res = makeRes();
    await userController.getProfile(req, res);

    expect(res._getStatus()).toBe(403);
  });

  test('error mapping: returns 404 on not found', async () => {
    const err = new Error('User not found');
    userService.getProfile.mockRejectedValue(err);

    const req = makeReq({}, { id: 'u-unknown' });
    const res = makeRes();
    await userController.getProfile(req, res);

    expect(res._getStatus()).toBe(404);
  });

  test('error mapping: returns 409 on conflict / slot already booked', async () => {
    const err = new Error('Slot already booked');
    userService.bookAppointment.mockRejectedValue(err);

    const req = makeReq({ doctorId: 'd1' }, { id: 'u1' });
    const res = makeRes();
    await userController.bookAppointment(req, res);

    expect(res._getStatus()).toBe(409);
  });

  test('error mapping: returns 502 on payment/provider issues', async () => {
    const err = new Error('Payment provider unavailable');
    userService.createRazorpayOrder.mockRejectedValue(err);

    const req = makeReq({ appointmentId: 'a1' }, { id: 'u1' });
    const res = makeRes();
    await userController.paymentRazorpay(req, res);

    expect(res._getStatus()).toBe(502);
  });

  test('error mapping: defaults to 500 for unknown error', async () => {
    const err = new Error('Some unknown internal error');
    userService.getDoctors.mockRejectedValue(err);

    const req = makeReq();
    const res = makeRes();
    await userController.getDoctors(req, res);

    expect(res._getStatus()).toBe(500);
    expect(res._getJSON().message).toMatch(/Some unknown internal error/);
  });
});
