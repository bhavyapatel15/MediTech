// backend/tests/unit/authUser.test.js
import jwt from 'jsonwebtoken';
import * as authUserModule from '../../middleware/authUser.js';

// resolve the actual middleware function regardless of export style
const authUser = authUserModule.authUser || authUserModule.default || authUserModule;

function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.payload = null;
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (obj) { this.payload = obj; return this; };
  return res;
}

test('authUser calls next when token valid', async () => {
  // ensure secret matches middleware (setupTests.js also sets it, but double-check)
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev';

  const token = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET);
  const req = { headers: { token } }; // middleware expects req.headers.token
  const res = makeRes();
  const next = jest.fn();

  // call middleware; handle either sync or async middleware
  const maybePromise = authUser(req, res, next);
  if (maybePromise && typeof maybePromise.then === 'function') {
    await maybePromise;
  }

  expect(next).toHaveBeenCalled();
});
