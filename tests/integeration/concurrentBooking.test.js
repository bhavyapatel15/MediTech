// tests/integeration/concurrentBooking.test.js

// Mock paymentService default export BEFORE importing app or services that import it.
jest.mock('../../services/paymentService.js', () => ({
  __esModule: true,
  default: {
    createOrder: jest.fn().mockResolvedValue({
      id: 'test-payment-id',
      amount: 100,
      currency: 'INR',
      status: 'success'
    }),
    getPaymentProvider: jest.fn(),
    verifyRazorpay: jest.fn()
  }
}));

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../../server.js';
import doctorModel from '../../models/doctorModel.js';
import userModel from '../../models/userModel.js';
import appointmentModel from '../../models/appointmentModel.js';

let mongoServer;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {});

  // IMPORTANT: ensure indexes are built before running tests that depend on unique constraints.
  // createIndexes() waits for index build and is safe to call repeatedly.
  await appointmentModel.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await doctorModel.deleteMany({});
  await userModel.deleteMany({});
  await appointmentModel.deleteMany({});
});

test('concurrent booking: only one appointment created', async () => {
  const doctorPayload = {
    name: 'Dr Test',
    date: Date.now(),
    address: '123 Test Lane',
    about: 'Test doctor',
    experience: 5,
    degree: 'MBBS',
    speciality: 'General',
    image: 'https://example.com/doc.jpg',
    password: 'DocPass123!',
    email: `doc${Date.now()}@example.com`,
    available: true,
    fees: 100
  };

  const doc = await doctorModel.create(doctorPayload);

  // register two users
  await request(app).post('/api/user/register').send({ name: 'User One', email: 'user1@test.com', password: 'Passw0rd!' }).expect(201);
  await request(app).post('/api/user/register').send({ name: 'User Two', email: 'user2@test.com', password: 'Passw0rd!' }).expect(201);

  // login both
  const r1 = await request(app).post('/api/user/login').send({ email: 'user1@test.com', password: 'Passw0rd!' });
  const token1 = r1.body?.data?.token || r1.body?.token || '';

  const r2 = await request(app).post('/api/user/login').send({ email: 'user2@test.com', password: 'Passw0rd!' });
  const token2 = r2.body?.data?.token || r2.body?.token || '';

  expect(token1).toBeTruthy();
  expect(token2).toBeTruthy();

  const payload = { doctorId: String(doc._id), slotDate: '2025-12-20', slotTime: '10:00', paymentMethod: 'stripe' };

  // Fire requests in parallel to simulate race
  const p1 = request(app).post('/api/user/book-appointment').set('token', token1).send(payload);
  const p2 = request(app).post('/api/user/book-appointment').set('token', token2).send(payload);

  const [res1, res2] = await Promise.all([p1, p2]);

  const successCount = [res1, res2].filter(r => r.statusCode === 201).length;

  if (successCount !== 1) {
    console.log('DEBUG booking responses:\n', {
      res1: { status: res1.statusCode, body: res1.body },
      res2: { status: res2.statusCode, body: res2.body }
    });
  }

  expect(successCount).toBe(1);

  const failureStatuses = [res1.statusCode, res2.statusCode].filter(s => s !== 201);
  expect(failureStatuses.length).toBe(1);
  expect([400, 401, 403, 409]).toContain(failureStatuses[0]);
}, 20000);
