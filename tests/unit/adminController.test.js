// tests/unit/adminController.test.js
/**
 * Unit tests for admin controller.
 *
 * These tests mock:
 * - appointmentModel
 * - doctorModel
 * - userModel
 * - bcrypt
 * - validator
 * - cloudinary.v2.uploader.upload
 * - jwt
 *
 * Place this file at: tests/unit/adminController.test.js
 */

jest.mock('../../models/appointmentModel.js');
jest.mock('../../models/doctorModel.js');
jest.mock('../../models/userModel.js');
jest.mock('bcrypt');
jest.mock('validator');
jest.mock('cloudinary', () => ({ v2: { uploader: { upload: jest.fn() } } }));
jest.mock('jsonwebtoken');

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import validator from 'validator';
import cloudinary from 'cloudinary';

import {
  loginAdmin,
  appointmentsAdmin,
  appointmentCancel,
  addDoctor,
  allDoctors,
  adminDashboard
} from '../../controllers/adminController.js';

import appointmentModel from '../../models/appointmentModel.js';
import doctorModel from '../../models/doctorModel.js';
import userModel from '../../models/userModel.js';

function makeReq(body = {}, file = null) {
  return { body, file };
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

describe('adminController', () => {
  const OLD_ENV = process.env;
  beforeAll(() => {
    process.env = { ...OLD_ENV };
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'pw';
    process.env.JWT_SECRET = 'secret';
  });
  afterAll(() => { process.env = OLD_ENV; });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('loginAdmin succeeds for correct credentials', async () => {
    const req = makeReq({ email: 'admin@example.com', password: 'pw' });
    const res = makeRes();
    jwt.sign.mockReturnValue('signed-token');

    await loginAdmin(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().success).toBe(true);
    expect(res._getJSON().token).toBe('signed-token');
  });

  test('loginAdmin returns 401 for invalid credentials', async () => {
    const req = makeReq({ email: 'x', password: 'y' });
    const res = makeRes();

    await loginAdmin(req, res);
    expect(res._getStatus()).toBe(401);
    expect(res._getJSON().message).toMatch(/Invalid credentials/i);
  });

  test('appointmentsAdmin returns appointments list', async () => {
    const fakeAppts = [{ _id: 'a1' }, { _id: 'a2' }];
    appointmentModel.find.mockResolvedValue(fakeAppts);

    const req = makeReq();
    const res = makeRes();
    await appointmentsAdmin(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().appointments).toBe(fakeAppts);
  });

  test('appointmentCancel updates appointment cancelled flag', async () => {
    appointmentModel.findByIdAndUpdate.mockResolvedValue(true);
    const req = makeReq({ appointmentId: 'a1' });
    const res = makeRes();

    await appointmentCancel(req, res);
    expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith('a1', { cancelled: true });
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().message).toMatch(/Appointment Cancelled/i);
  });

  test('addDoctor validation: returns 400 if missing fields', async () => {
    const req = makeReq({ name: 'n' }); // missing many fields
    req.file = null;
    const res = makeRes();

    await addDoctor(req, res);
    expect(res._getStatus()).toBe(400);
    expect(res._getJSON().message).toMatch(/Missing Details/i);
  });

  test('addDoctor validation: invalid email => 400', async () => {
    const req = makeReq({
      name: 'n', email: 'bad', password: 'password123', speciality: 's', degree: 'd',
      experience: 1, about: 'a', fees: 10, address: JSON.stringify({}), 
    });
    req.file = { path: '/tmp/x' };
    validator.isEmail.mockReturnValue(false);
    const res = makeRes();

    await addDoctor(req, res);
    expect(res._getStatus()).toBe(400);
    expect(res._getJSON().message).toMatch(/valid email/i);
  });

  test('addDoctor validation: weak password => 400', async () => {
    const req = makeReq({
      name: 'n', email: 'a@b.com', password: 'short', speciality: 's', degree: 'd',
      experience: 1, about: 'a', fees: 10, address: JSON.stringify({}),
    });
    req.file = { path: '/tmp/x' };
    validator.isEmail.mockReturnValue(true);
    const res = makeRes();

    await addDoctor(req, res);
    expect(res._getStatus()).toBe(400);
    expect(res._getJSON().message).toMatch(/strong password/i);
  });

  test('addDoctor happy path calls cloudinary and saves doctor', async () => {
    const fakeUpload = { secure_url: 'https://img' };
    cloudinary.v2.uploader.upload.mockResolvedValue(fakeUpload);

    // bcrypt fake
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashedpw');

    const req = makeReq({
      name: 'n', email: 'doc@example.com', password: 'strongpass',
      speciality: 's', degree: 'd', experience: 1, about: 'a', fees: 10, address: JSON.stringify({ city: 'x' })
    });
    req.file = { path: '/tmp/file.jpg' };

    // mock doctorModel constructor and save
    const saveMock = jest.fn().mockResolvedValue(true);
    const fakeDoctorCtor = function (data) { this.save = saveMock; };
    doctorModel.mockImplementation(() => fakeDoctorCtor);

    // But controllers use new doctorModel(...) then .save(); we can stub by providing mock on prototype
    // Simpler: spy on doctorModel.prototype.save if doctorModel is a function. If doctorModel is mocked object, set as below:
    doctorModel.mockImplementation(() => ({ save: saveMock }));

    const res = makeRes();
    await addDoctor(req, res);

    expect(cloudinary.v2.uploader.upload).toHaveBeenCalledWith('/tmp/file.jpg', { resource_type: 'image' });
    expect(bcrypt.hash).toHaveBeenCalled();
    expect(res._getStatus()).toBe(201);
    expect(res._getJSON().message).toMatch(/Doctor Added/i);
  });

  test('allDoctors returns list (excludes password in original controller via select call)', async () => {
    const doctors = [{ name: 'd1' }];
    doctorModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue(doctors) });

    const req = makeReq();
    const res = makeRes();
    await allDoctors(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().doctors).toBe(doctors);
  });

  test('adminDashboard returns counts and latestAppointments', async () => {
    doctorModel.find.mockResolvedValue([1, 2]);
    userModel.find.mockResolvedValue([1, 2, 3]);
    appointmentModel.find.mockResolvedValue([{ _id: 'a1' }, { _id: 'a2' }]);

    const req = makeReq();
    const res = makeRes();
    await adminDashboard(req, res);

    expect(res._getStatus()).toBe(200);
    const dashData = res._getJSON().dashData;
    expect(dashData.doctors).toBe(2);
    expect(dashData.appointments).toBe(2);
    expect(dashData.patients).toBe(3);
    expect(Array.isArray(dashData.latestAppointments)).toBe(true);
  });
});
