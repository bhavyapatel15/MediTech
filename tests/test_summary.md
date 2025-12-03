# test.md

> **Testing — Summary, Coverage & Impact**  
> This document summarizes the test results, coverage, test mapping, and the technical/business impact of the test suite for the MediTech backend.

---

## 📌 Test execution & pass / fail summary

- **Result:** All test suites pass — **21 / 21**.  
- **Tests:** **99 / 99** passed.  
- **Total run time:** ≈ **6.6s** (fast, suitable for CI).  

> These numbers reflect the current test run snapshot used for grading and demonstration.

---

## 📊 Coverage details (current snapshot)

- **Statements:** **76.62%**  
- **Branches:** **65.38%**  
- **Functions:** **77.46%**  
- **Lines:** **79.08%**
<img width="1918" height="822" alt="image" src="https://github.com/user-attachments/assets/89045bc7-619c-4083-a0ba-5878b27d2f84" />

### Hotspots (areas with lower coverage)
- `backend/services/` — **~62% statements**, branch coverage ~**52%**  
  - Key services needing more tests: `appointmentService`, `paymentService`, `userService` (add more negative/edge branches).
- `backend/server.js` — missing coverage on startup/export branches (e.g. `if (require.main === module)` vs. `module.exports = app`).

> Goal: raise overall coverage to **70%+** for the project and **85%+** for critical services.

---

## 📁 Mapping of test files → responsibilities

> **Note:** there is a small repository typo `integeration` in older commits — consider renaming to `integration` and updating `jest.config.cjs`.

- **`tests/integration/concurrentBooking.test.js`**  
  Validates booking behavior under concurrent requests. Ensures one request succeeds and overlapping requests return **409 Conflict**.

- **`tests/integration/userRoutes.test.js`**  
  End-to-end tests for user flows:
  - `POST /api/user/register`
  - `POST /api/user/login`
  - `POST /api/user/book-appointment` (happy path)
  Tests HTTP status codes, response shapes, and DB state effects.

- **`tests/unit/userService.test.js`**  
  Unit tests for `userService`:
  - `registerUser` (happy, invalid, duplicate, missing fields)
  - `loginUser` (happy, wrong password, non-existent)
  - `getProfile` (authorized retrieval, not-found)
  - `updateProfile` (field updates, image upload via cloudinary mock)

- **`tests/unit/appointmentService.test.js`**  
  Unit tests for core booking logic:
  - `isSlotAvailable` behavior
  - `bookAppointmentService` (doctor unavailable, slot already booked, successful booking)

- **`tests/unit/paymentAdapters.test.js`**  
  Verifies each payment adapter implements the expected interface and behavior (`createOrder`, `verify`).

- **`tests/integration/paymentFactory.test.js`**  
  Verifies the payment factory returns the correct adapter and errors for invalid providers.

- **`tests/unit/*Controller.test.js`**  
  Controller-level tests (thin): validate that controllers call services correctly and map service results/errors to HTTP responses.

---

## 🧩 What each test type verifies (short)

- **Unit tests**
  - Isolate service logic.
  - Mock DB models and external SDKs.
  - Target edge cases, validation errors, and thrown exceptions.

- **Integration tests**
  - Run Express routes with `supertest`.
  - Use `mongodb-memory-server` for a fast in-memory DB.
  - Validate middleware, routing, and real wiring of controllers → services.

- **Concurrency tests**
  - Simulate parallel requests (Promise.all) to detect race conditions.
  - Assert DB integrity (single booking persisted) and expected HTTP conflict codes.

---

## 🧪 How to run tests locally

From the `backend/` folder:

```bash
# install deps (first time)
npm ci

# optional: clear jest cache
npx jest --clearCache

# run full suite with coverage
npm test
# (or explicit)
npx jest --config=jest.config.cjs --runInBand --coverage
