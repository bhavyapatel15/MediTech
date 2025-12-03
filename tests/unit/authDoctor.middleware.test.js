// tests/unit/authDoctor.middleware.test.js
import jwt from 'jsonwebtoken';
import authDoctor from '../../middleware/authDoctor.js';

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

describe('authDoctor middleware (matches implementation)', () => {
  let origConsole;
  beforeAll(() => {
    // silence console.log during tests that cause errors
    origConsole = console.log;
    console.log = jest.fn();
  });
  afterAll(() => { console.log = origConsole; });

  afterEach(() => jest.resetAllMocks());

  test('returns 401 when dtoken header missing', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    authDoctor(req, res, next);
    expect(res._getStatus()).toBe(401);
    expect(res._getJSONData().message).toMatch(/not authorized/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches docId and calls next when token valid', () => {
    const payload = { id: 'doc123' };
    jwt.verify.mockImplementation(() => payload);

    const req = { headers: { dtoken: 'ok' }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    authDoctor(req, res, next);

    expect(res._getStatus()).toBe(200);
    // middleware sets req.body.docId
    expect(req.body.docId).toBe('doc123');
    expect(next).toHaveBeenCalled();
  });

  test('returns 500 when jwt.verify throws', () => {
    jwt.verify.mockImplementation(() => { throw new Error('verify error'); });

    const req = { headers: { dtoken: 'bad' }, body: {} };
    const res = makeRes();
    const next = jest.fn();

    authDoctor(req, res, next);

    expect(res._getStatus()).toBe(500);
    expect(res._getJSONData().message).toBe('verify error');
    expect(next).not.toHaveBeenCalled();
  });
});
