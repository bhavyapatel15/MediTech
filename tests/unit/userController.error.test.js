// tests/unit/userController.error.test.js
import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import * as userController from '../../controllers/userController.js';
import * as userService from '../../services/userService.js';

// Build a tiny express app to mount controller handlers for testing
const app = express();
app.use(bodyParser.json());

// mount route handlers we want to test
app.post('/register', (req, res) => userController.registerUser(req, res));
app.post('/book', (req, res) => userController.bookAppointment(req, res));
app.post('/payment', (req, res) => userController.paymentRazorpay(req, res));

describe('userController error mapping', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('registerUser returns 400 for invalid email error thrown by service', async () => {
    jest.spyOn(userService, 'registerUser').mockRejectedValue(new Error('Invalid email'));
    const res = await request(app).post('/register').send({ name: 'A', email: 'bad', password: 'p' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email/i);
  });

  test('bookAppointment returns 409 when service throws slot already booked', async () => {
    const err = new Error('Slot already booked');
    // simulate service throwing with no status but message indicating conflict
    jest.spyOn(userService, 'bookAppointment').mockRejectedValue(err);

    // fake authenticated user by setting req.user in middleware emulation: controller pulls req.user
    const authApp = express();
    authApp.use(bodyParser.json());
    // attach a fake user
    authApp.post('/book', (req, res, next) => { req.user = { id: 'user1' }; next(); }, (req, res) => userController.bookAppointment(req, res));

    const res = await request(authApp).post('/book').send({ doctorId: 'd', slotDate: '2025-12-20', slotTime: '10:00' });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/slot already booked/i);
  });

  test('paymentRazorpay maps provider error to 502', async () => {
    const e = new Error('Payment provider error: upstream');
    e.status = 502;
    jest.spyOn(userService, 'createRazorpayOrder').mockRejectedValue(e);

    const authApp = express();
    authApp.use(bodyParser.json());
    authApp.post('/pay', (req, res, next) => { req.user = { id: 'u1' }; next(); }, (req, res) => userController.paymentRazorpay(req, res));

    const res = await request(authApp).post('/pay').send({ appointmentId: 'a1' });
    expect(res.statusCode).toBe(502);
    expect(res.body.message).toMatch(/payment provider error/i);
  });
});
