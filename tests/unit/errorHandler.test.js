// tests/unit/errorHandler.test.js
import errorHandler from '../../middleware/errorHandler.js';

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

describe('errorHandler middleware', () => {
  test('sends JSON error response with status from error.status', () => {
    const err = new Error('boom');
    err.status = 418;
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);
    expect(res._getStatus()).toBe(418);
    const body = res._getJSONData();
    expect(body.message).toMatch(/boom/);
  });

  test('defaults to 500 when no status provided', () => {
    const err = new Error('unknown');
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    expect(res._getStatus()).toBe(500);
    expect(res._getJSONData().message).toMatch(/unknown/);
  });
});
