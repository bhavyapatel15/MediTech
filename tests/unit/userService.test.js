// backend/tests/unit/userService.test.js

// Ensure the cloudinary mock is hoisted before any imports that may use it.
jest.mock('../../services/cloudinaryService.js');

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

import * as userService from '../../services/userService.js';
import userModel from '../../models/userModel.js';
import appointmentModel from '../../models/appointmentModel.js';
import cloudinaryService from '../../services/cloudinaryService.js';

jest.mock('../../models/userModel.js');
jest.mock('../../models/appointmentModel.js');

describe('userService - unit tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    test('should create user and return token on success', async () => {
      // ARRANGE
      userModel.findOne.mockResolvedValue(null);
      const fakeUser = { _id: 'u123', email: 'alice@example.com' };
      userModel.create.mockResolvedValue(fakeUser);

      // ACT
      const result = await userService.registerUser({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Str0ngPass!'
      });

      // ASSERT
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'alice@example.com' });
      expect(userModel.create).toHaveBeenCalled();
      expect(result).toHaveProperty('userId', fakeUser._id);
      expect(result).toHaveProperty('token');
      const decoded = jwt.decode(result.token);
      expect(decoded.email).toBe('alice@example.com');
    });

    test('should reject when required fields missing', async () => {
      await expect(userService.registerUser({ email: '', password: '' })).rejects.toThrow(/required/i);
    });

    test('should reject invalid email', async () => {
      await expect(userService.registerUser({ name: 'A', email: 'not-an-email', password: 'pass' })).rejects.toThrow(/invalid email/i);
    });

    test('should reject duplicate email', async () => {
      userModel.findOne.mockResolvedValue({ _id: 'existing' });
      await expect(userService.registerUser({ name: 'Dup', email: 'dup@example.com', password: 'pass' })).rejects.toThrow(/already registered/i);
    });
  });

  describe('loginUser', () => {
    test('should return token for valid credentials', async () => {
      const hashed = await bcrypt.hash('MySecret123', 10);
      userModel.findOne.mockResolvedValue({ _id: 'u1', email: 'bob@example.com', password: hashed });
      const token = await userService.loginUser({ email: 'bob@example.com', password: 'MySecret123' });
      expect(typeof token).toBe('string');
      const decoded = jwt.decode(token);
      expect(decoded.email).toBe('bob@example.com');
    });

    test('should throw for invalid password', async () => {
      const hashed = await bcrypt.hash('RightPass', 10);
      userModel.findOne.mockResolvedValue({ _id: 'u2', email: 'jane@example.com', password: hashed });
      await expect(userService.loginUser({ email: 'jane@example.com', password: 'WrongPass' })).rejects.toThrow(/invalid credentials/i);
    });

    test('should throw for non-existent user', async () => {
      userModel.findOne.mockResolvedValue(null);
      await expect(userService.loginUser({ email: 'noone@example.com', password: 'x' })).rejects.toThrow(/invalid credentials/i);
    });
  });

  describe('getProfile', () => {
    test('returns profile for valid user', async () => {
      const profile = { _id: 'u100', email: 'p@test.com', name: 'P' };
      // Mock findById to return an object with select() which resolves to the profile
      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(profile)
      });

      const res = await userService.getProfile('u100');
      expect(res).toEqual(profile);
      expect(userModel.findById).toHaveBeenCalledWith('u100');
    });

    test('throws when user not found', async () => {
      // Return a select() that resolves to null
      userModel.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(userService.getProfile('missing')).rejects.toThrow(/not found/i);
      expect(userModel.findById).toHaveBeenCalledWith('missing');
    });
  });

  describe('updateProfile', () => {
    test('updates name and phone when provided', async () => {
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: 'u1', name: 'New', phone: '9999' });
      await expect(userService.updateProfile('u1', { name: 'New', phone: '9999' })).resolves.toBeUndefined();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('u1', expect.objectContaining({ name: 'New', phone: '9999' }), { new: true });
    });

    test('uploads image when file present', async () => {
      const fakeFile = { path: '/tmp/fake.jpg' };
      // cloudinaryService.uploadImage is mocked (via setupTests + explicit jest.mock above)
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: 'u2', image: 'https://example.com/test-image.jpg' });
      await expect(userService.updateProfile('u2', { file: fakeFile })).resolves.toBeUndefined();

      expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(fakeFile);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    test('throws when unauthorized (no userId)', async () => {
      await expect(userService.updateProfile(null, { name: 'x' })).rejects.toThrow(/unauthorized/i);
    });
  });
});
