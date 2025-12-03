// tests/unit/authAdmin.middleware.test.js
import jwt from 'jsonwebtoken';
import authAdmin from '../../middleware/authAdmin.js';

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

describe('authAdmin middleware (matches implementation)', () => {
  let origAdminEmail, origAdminPass, origConsole;
  beforeAll(() => {
    // ensure env vars exist for the "valid token" test
    origAdminEmail = process.env.ADMIN_EMAIL;
    origAdminPass = process.env.ADMIN_PASSWORD;
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.ADMIN_PASSWORD = 'SuperSecret';
    // silence console.log during tests that cause errors
    origConsole = console.log;
    console.log = jest.fn();
  });

  afterAll(() => {
    process.env.ADMIN_EMAIL = origAdminEmail;
    process.env.ADMIN_PASSWORD = origAdminPass;
    console.log = origConsole;
  });

  afterEach(() => jest.resetAllMocks());

  test('returns 401 when atoken header missing', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    authAdmin(req, res, next);
    expect(res._getStatus()).toBe(401);
    expect(res._getJSONData().message).toBe('Not Authorized. Login Again.');
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token_verify result does not match admin credentials', () => {
    // jwt.verify returns something that is not the concatenated admin email+password
    jwt.verify.mockImplementation(() => 'some-random-value');

    const req = { headers: { atoken: 't' } };
    const res = makeRes();
    const next = jest.fn();

    authAdmin(req, res, next);

    expect(res._getStatus()).toBe(401);
    expect(res._getJSONData().message).toBe('Not Authorized. Login Again.');
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when jwt.verify returns the concatenated admin credentials', () => {
    // jwt.verify must return the exact concatenation the middleware expects
    const expected = process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD;
    jwt.verify.mockImplementation(() => expected);

    const req = { headers: { atoken: 'valid' } };
    const res = makeRes();
    const next = jest.fn();

    authAdmin(req, res, next);

    // Should not have sent an error response
    expect(res._getStatus()).toBe(200);
    expect(next).toHaveBeenCalled();
  });

  test('returns 500 when jwt.verify throws', () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt failure'); });

    const req = { headers: { atoken: 'bad' } };
    const res = makeRes();
    const next = jest.fn();

    authAdmin(req, res, next);

    expect(res._getStatus()).toBe(500);
    expect(res._getJSONData().message).toBe('jwt failure');
  });
});
