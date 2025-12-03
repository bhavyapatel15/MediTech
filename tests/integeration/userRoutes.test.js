// tests/integration/userRoutes.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../../server.js';
import userModel from '../../models/userModel.js';

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), { });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await userModel.deleteMany({});
});

test('POST /api/user/register -> 201 and user created', async () => {
  const res = await request(app)
    .post('/api/user/register')
    .send({ name: 'Alice', email: 'alice@example.com', password: 'Passw0rd!' });

  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);
  const user = await userModel.findOne({ email: 'alice@example.com' });
  expect(user).not.toBeNull();
});

test('concurrent booking should only allow single appointment', async () => {
  // setup: create user, doctor etc. (You must seed doctor and auth)
  // Example pseudocode:
  // await createDoctor(...); await createUserAndGetToken();
  // Then run two concurrent requests with same slot and assert results
});
