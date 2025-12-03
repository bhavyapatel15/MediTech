// tests/unit/userService.bookAppointment.test.js
import mongoose from 'mongoose';
import * as userService from '../../services/userService.js';
import appointmentModel from '../../models/appointmentModel.js';
import doctorModel from '../../models/doctorModel.js';
import userModel from '../../models/userModel.js';
import paymentService from '../../services/paymentService.js';

jest.mock('../../models/appointmentModel.js');
jest.mock('../../models/doctorModel.js');
jest.mock('../../models/userModel.js');
jest.mock('../../services/paymentService.js');

describe('userService.bookAppointment error paths', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('throws 409 when appointmentModel.create throws duplicate key', async () => {
    // Arrange: doctor exists and is available
    doctorModel.findById = jest.fn().mockResolvedValue({ _id: 'doc1', available: true, fees: 100 });
    userModel.findById = jest.fn().mockResolvedValue({ _id: 'user1' });

    const dupErr = new Error('E11000 duplicate key');
    dupErr.code = 11000;
    appointmentModel.create = jest.fn().mockRejectedValue(dupErr);

    // Act & Assert
    await expect(userService.bookAppointment({
      userId: 'user1', doctorId: 'doc1', slotDate: '2025-12-20', slotTime: '10:00', paymentMethod: 'razorpay'
    })).rejects.toMatchObject({ message: 'Slot already booked' });
  });

  test('rolls back appointment when payment creation fails after create', async () => {
    doctorModel.findById = jest.fn().mockResolvedValue({ _id: 'doc1', available: true, fees: 100 });
    userModel.findById = jest.fn().mockResolvedValue({ _id: 'user1' });

    // appointmentModel.create initially succeeds
    const createdAppt = { _id: new mongoose.Types.ObjectId(), save: jest.fn(), paymentOrder: null };
    appointmentModel.create = jest.fn().mockResolvedValue(createdAppt);

    // paymentService.createOrder fails
    const payErr = new Error('Payment provider unreachable');
    payErr.status = 502;
    paymentService.createOrder = jest.fn().mockRejectedValue(payErr);

    // appointmentModel.findByIdAndDelete should be called during rollback
    appointmentModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);

    await expect(userService.bookAppointment({
      userId: 'user1', doctorId: 'doc1', slotDate: '2025-12-20', slotTime: '10:00', paymentMethod: 'razorpay'
    })).rejects.toMatchObject({ message: /Failed to create payment order/i });

    expect(appointmentModel.findByIdAndDelete).toHaveBeenCalledWith(createdAppt._id);
  });
});
