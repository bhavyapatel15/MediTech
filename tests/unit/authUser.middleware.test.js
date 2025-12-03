// tests/unit/authUser.middleware.test.js
import jwt from 'jsonwebtoken';
import authUser from '../../middleware/authUser.js';

jest.mock('jsonwebtoken');

function makeRes() {
  let statusCode = 200;
  let body = null;
  return {
    status(code) { statusCode = code; return this; },
    json(obj) { body = obj; return this; },
    _getStatus() { return statusCode; },
    _getJSONData() { return body; }
  };
}

describe('authUser middleware (hand-rolled mocks)', () => {
  let originalConsoleLog;
  beforeAll(() => {
    // Silence console.log during tests to avoid noisy output from middleware
    originalConsoleLog = console.log;
    console.log = jest.fn();
  });
  afterAll(() => {
    console.log = originalConsoleLog;
  });

  afterEach(() => jest.resetAllMocks());

  test('responds 401 when token not provided', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    authUser(req, res, next);
    expect(res._getStatus()).toBe(401);
    const data = res._getJSONData();
    expect(data.message).toMatch(/not authorized/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('allows when token valid (no error response sent)', () => {
    const fakePayload = { id: 'u1', email: 'a@b.com' };
    jwt.verify.mockImplementation(() => fakePayload);

    const req = { headers: { token: 'valid' } };
    const res = makeRes();
    const next = jest.fn();

    authUser(req, res, next);

    expect(res._getStatus()).toBe(200);
  });

  test('responds 401 on invalid token', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
    const req = { headers: { token: 'bad' } };
    const res = makeRes();
    const next = jest.fn();

    authUser(req, res, next);
    expect(res._getStatus()).toBe(401);
    const json = res._getJSONData();
    expect(json.message).toMatch(/invalid or expired/i);
  });
});
