// tests/unit/doctorController.test.js
/**
 * Unit tests for doctor controller.
 *
 * These tests mock:
 * - doctorModel
 * - appointmentModel
 * - bcrypt
 * - jwt
 *
 * Place this file at: tests/unit/doctorController.test.js
 */

jest.mock('../../models/doctorModel.js');
jest.mock('../../models/appointmentModel.js');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import {
  loginDoctor,
  appointmentsDoctor,
  appointmentCancel,
  appointmentComplete,
  doctorList,
  changeAvailablity,
  doctorProfile,
  updateDoctorProfile,
  doctorDashboard
} from '../../controllers/doctorController.js';

import doctorModel from '../../models/doctorModel.js';
import appointmentModel from '../../models/appointmentModel.js';

function makeReq(body = {}) { return { body }; }
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

describe('doctorController', () => {
  afterEach(() => jest.clearAllMocks());

  test('loginDoctor success when credentials valid', async () => {
    const fakeUser = { _id: 'u1', password: 'hashed' };
    doctorModel.findOne.mockResolvedValue(fakeUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('doc-token');

    const req = makeReq({ email: 'd@x.com', password: 'p' });
    const res = makeRes();

    await loginDoctor(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().token).toBe('doc-token');
  });

  test('loginDoctor returns 401 when user not found', async () => {
    doctorModel.findOne.mockResolvedValue(null);
    const req = makeReq({ email: 'x', password: 'y' });
    const res = makeRes();
    await loginDoctor(req, res);

    expect(res._getStatus()).toBe(401);
    expect(res._getJSON().message).toMatch(/Invalid credentials/i);
  });

  test('appointmentsDoctor returns appointments for given docId', async () => {
    const appts = [{ _id: 'a1' }];
    appointmentModel.find.mockResolvedValue(appts);

    const req = makeReq({ docId: 'doc1' });
    const res = makeRes();
    await appointmentsDoctor(req, res);

    expect(appointmentModel.find).toHaveBeenCalledWith({ docId: 'doc1' });
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().appointments).toBe(appts);
  });

  test('appointmentCancel allowed when docId matches', async () => {
    const appt = { _id: 'a1', docId: 'doc1' };
    appointmentModel.findById.mockResolvedValue(appt);
    appointmentModel.findByIdAndUpdate.mockResolvedValue(true);

    const req = makeReq({ docId: 'doc1', appointmentId: 'a1' });
    const res = makeRes();

    await appointmentCancel(req, res);
    expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith('a1', { cancelled: true });
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().message).toMatch(/Appointment Cancelled/i);
  });

  test('appointmentCancel returns 403 when not allowed', async () => {
    appointmentModel.findById.mockResolvedValue({ docId: 'other' });
    const req = makeReq({ docId: 'doc1', appointmentId: 'a1' });
    const res = makeRes();

    await appointmentCancel(req, res);
    expect(res._getStatus()).toBe(403);
    expect(res._getJSON().message).toMatch(/Not Allowed/i);
  });

  test('appointmentComplete marks appointment as completed when docId matches', async () => {
    appointmentModel.findById.mockResolvedValue({ docId: 'doc1' });
    appointmentModel.findByIdAndUpdate.mockResolvedValue(true);

    const req = makeReq({ docId: 'doc1', appointmentId: 'a1' });
    const res = makeRes();

    await appointmentComplete(req, res);
    expect(appointmentModel.findByIdAndUpdate).toHaveBeenCalledWith('a1', { isCompleted: true });
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().message).toMatch(/Appointment Completed/i);
  });

  test('doctorList returns doctors excluding sensitive fields', async () => {
    doctorModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ name: 'x' }]) });

    const req = makeReq();
    const res = makeRes();
    await doctorList(req, res);
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().doctors).toBeDefined();
  });

  test('changeAvailablity toggles available flag', async () => {
    doctorModel.findById.mockResolvedValue({ available: true });
    doctorModel.findByIdAndUpdate.mockResolvedValue(true);

    const req = makeReq({ docId: 'd1' });
    const res = makeRes();
    await changeAvailablity(req, res);

    expect(doctorModel.findByIdAndUpdate).toHaveBeenCalledWith('d1', { available: false });
    expect(res._getStatus()).toBe(200);
  });

  test('doctorProfile returns profile data', async () => {
    doctorModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'doc' }) });

    const req = makeReq({ docId: 'd1' });
    const res = makeRes();
    await doctorProfile(req, res);

    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().profileData).toBeDefined();
  });

  test('updateDoctorProfile updates fields', async () => {
    doctorModel.findByIdAndUpdate.mockResolvedValue(true);
    const req = makeReq({ docId: 'd1', fees: 50, address: { city: 'x' }, available: true });
    const res = makeRes();
    await updateDoctorProfile(req, res);

    expect(doctorModel.findByIdAndUpdate).toHaveBeenCalledWith('d1', { fees: 50, address: { city: 'x' }, available: true });
    expect(res._getStatus()).toBe(200);
    expect(res._getJSON().message).toMatch(/Profile Updated/i);
  });

  test('doctorDashboard computes earnings and patients', async () => {
    const appointments = [
      { isCompleted: true, payment: false, amount: 100, userId: 'u1' },
      { isCompleted: false, payment: true, amount: 50, userId: 'u2' },
      { isCompleted: false, payment: false, amount: 30, userId: 'u1' }
    ];
    appointmentModel.find.mockResolvedValue(appointments);

    const req = makeReq({ docId: 'd1' });
    const res = makeRes();
    await doctorDashboard(req, res);

    const dashData = res._getJSON().dashData;
    expect(dashData.earnings).toBe(150); // only first two count
    expect(dashData.appointments).toBe(3);
    expect(dashData.patients).toBe(2);
    expect(Array.isArray(dashData.latestAppointments)).toBe(true);
  });
});
