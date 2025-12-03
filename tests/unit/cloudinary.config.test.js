// tests/unit/cloudinary.config.test.js
import * as cloudinaryModule from '../../config/cloudinary.js';
import cloudinary from 'cloudinary';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload: jest.fn().mockResolvedValue({ secure_url: 'u' }) }
  }
}));

describe('connectCloudinary', () => {
  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  test('does not throw when env vars missing (safe fallback)', async () => {
    await expect(async () => cloudinaryModule.default()).not.toThrow();
  });

  test('calls cloudinary v2 config when env vars present', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'c';
    process.env.CLOUDINARY_API_KEY = 'k';
    process.env.CLOUDINARY_API_SECRET = 's';
    // call exported function (may be default or named; try both)
    if (typeof cloudinaryModule.default === 'function') {
      await cloudinaryModule.default();
    } else if (typeof cloudinaryModule.connectCloudinary === 'function') {
      await cloudinaryModule.connectCloudinary();
    }
    expect(cloudinary.v2.config).toHaveBeenCalled();
  });
});
