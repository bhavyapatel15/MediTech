// tests/unit/userController.success.test.js
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import * as userController from '../../controllers/userController.js';
import * as userService from '../../services/userService.js';

const app = express();
app.use(bodyParser.json());
app.post('/register', (req, res) => userController.registerUser(req, res));
app.post('/login', (req, res) => userController.loginUser(req, res));
app.post('/book', (req, res, next) => { req.user = { id: 'u1' }; next(); }, (req, res) => userController.bookAppointment(req, res));

describe('userController success paths', () => {
  afterEach(() => jest.restoreAllMocks());

  test('registerUser returns 201 and data', async () => {
    jest.spyOn(userService, 'registerUser').mockResolvedValue({ userId: 'u1', token: 't' });
    const res = await request(app).post('/register').send({ name: 'A', email: 'a@b.com', password: 'p' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('t');
  });

  test('loginUser returns token', async () => {
    jest.spyOn(userService, 'loginUser').mockResolvedValue('tok123');
    const res = await request(app).post('/login').send({ email: 'a@b.com', password: 'p' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBe('tok123');
  });

  test('bookAppointment returns 201 on success', async () => {
    const fakeAppt = { _id: 'a1', slotDate: '2025-12-20', slotTime: '10:00' };
    jest.spyOn(userService, 'bookAppointment').mockResolvedValue(fakeAppt);
    const res = await request(app).post('/book').send({ doctorId: 'd1', slotDate: '2025-12-20', slotTime: '10:00' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data._id).toBe('a1');
  });
});
