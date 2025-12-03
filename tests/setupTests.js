// backend/tests/setupTests.js
// Centralized test setup: global mocks & helpers.
// This runs before each test file (configured via jest.config.cjs).

// Ensure a predictable JWT secret for tests so jwt.sign and jwt.verify agree.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev';

// Increase timeout if necessary
jest.setTimeout(10000);

// Mock cloudinaryService so uploadImage won't call network in unit tests
jest.mock('../services/cloudinaryService.js', () => {
  const uploadImageMock = jest.fn(async (file) => ({
    secure_url: 'https://example.com/test-image.jpg',
    public_id: 'test-img',
  }));

  return {
    __esModule: true,
    uploadImage: uploadImageMock,
    default: { uploadImage: uploadImageMock },
  };
});

// Optionally silence noisy logs during tests
// jest.spyOn(global.console, 'error').mockImplementation(() => {});
// jest.spyOn(global.console, 'log').mockImplementation(() => {});
