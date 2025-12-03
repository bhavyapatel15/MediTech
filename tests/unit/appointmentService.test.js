// tests/unit/appointmentService.test.js
import { jest } from '@jest/globals';

// Adjust path to match your test file location; example assumes test at backend/tests/unit
import * as appointmentService from '../../services/appointmentService.js';

// Mock models used inside service
import appointmentModel from '../../models/appointmentModel.js';
import doctorModel from '../../models/doctorModel.js';

jest.mock('../../models/appointmentModel.js');
jest.mock('../../models/doctorModel.js');

describe('Appointment Service Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Should throw error if doctor is unavailable', async () => {
    doctorModel.findById = jest.fn().mockResolvedValue({ _id: 'doc1', available: false });

    await expect(appointmentService.bookAppointmentService('user1', 'doc1', '2025-10-10', '10:00'))
      .rejects.toThrow('Doctor is not available');
  });

  test('Should throw error if slot is already booked', async () => {
    doctorModel.findById = jest.fn().mockResolvedValue({ _id: 'doc1', available: true });
    appointmentModel.findOne = jest.fn().mockResolvedValue({ _id: 'appt1' });

    await expect(appointmentService.bookAppointmentService('user1', 'doc1', '2025-10-10', '10:00'))
      .rejects.toThrow('Slot is already booked');
  });

  test('Should successfully book a free slot', async () => {
    doctorModel.findById = jest.fn().mockResolvedValue({ _id: 'doc1', available: true });
    appointmentModel.findOne = jest.fn().mockResolvedValue(null);
    appointmentModel.create = jest.fn().mockResolvedValue({ _id: 'appt1', user: 'user1', doctor: 'doc1' });

    const appt = await appointmentService.bookAppointmentService('user1', 'doc1', '2025-10-10', '10:00');
    expect(appointmentModel.create).toHaveBeenCalled();
    expect(appt).toHaveProperty('_id', 'appt1');
  });
});
