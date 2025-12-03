// tests/unit/mongodb.config.test.js
/**
 * Robust mongoose mock for connectDB tests. The real config references
 * mongoose.connect and mongoose.connection.on/once — so the mock must supply them.
 */
jest.mock('mongoose', () => {
  return {
    connect: jest.fn(),
    connection: {
      on: jest.fn(),
      once: jest.fn(),
      readyState: 0
    }
  };
});

import mongoose from 'mongoose';
import connectDB from '../../config/mongodb.js';

describe('connectDB (mongodb config)', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.MONGO_URI;
  });

  test('does not throw when MONGO_URI is not set (safe fallback)', async () => {
    mongoose.connect.mockResolvedValue(true);
    await expect(connectDB()).resolves.not.toThrow();
  });

  test('calls mongoose.connect when MONGO_URI present', async () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';
    mongoose.connect.mockResolvedValue(true);
    await connectDB();
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });

  test('propagates error when mongoose.connect rejects', async () => {
    process.env.MONGO_URI = 'mongodb://bad';
    const err = new Error('fail');
    mongoose.connect.mockRejectedValue(err);
    await expect(connectDB()).rejects.toThrow('fail');
  });
});
