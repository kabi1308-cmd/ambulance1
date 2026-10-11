import assert from "node:assert";
import { formatApiError } from "../frontend/src/utils/errorFormatter.js";

console.log("=== RUNNING FRONTEND ERROR FORMATTER TESTS ===");

// 1. Direct string
const strErr = formatApiError("Bed update failed.");
assert.strictEqual(strErr, "Bed update failed.");
assert.strictEqual(typeof strErr, "string");
console.log("1. Direct string test: PASS");

// 2. FastAPI 422 Validation detail array (array of objects)
const fastApi422 = {
  response: {
    status: 422,
    data: {
      detail: [
        { loc: ["body", "ambulance_lat"], msg: "Input should be less than or equal to 90", type: "less_than_equal" },
        { loc: ["body", "ambulance_lng"], msg: "Input should be a valid number", type: "float_type" }
      ]
    }
  }
};
const res422 = formatApiError(fastApi422);
assert.strictEqual(typeof res422, "string");
assert.ok(res422.includes("ambulance_lat: Input should be less than or equal to 90"));
assert.ok(res422.includes("ambulance_lng: Input should be a valid number"));
console.log("2. FastAPI 422 detail array test: PASS ->", res422);

// 3. FastAPI HTTPException string detail
const fastApi400 = {
  response: {
    status: 400,
    data: {
      detail: "CRITICAL EMERGENCY: No available ICU beds within service radius."
    }
  }
};
const res400 = formatApiError(fastApi400);
assert.strictEqual(typeof res400, "string");
assert.strictEqual(res400, "CRITICAL EMERGENCY: No available ICU beds within service radius.");
console.log("3. FastAPI HTTPException detail string test: PASS ->", res400);

// 4. Network error (no response received)
const netErr = {
  message: "Network Error",
  request: {}
};
const resNet = formatApiError(netErr);
assert.strictEqual(typeof resNet, "string");
assert.ok(resNet.includes("Network error"));
console.log("4. Network error test: PASS ->", resNet);

// 5. Request timeout
const timeoutErr = {
  code: "ECONNABORTED",
  message: "timeout of 8000ms exceeded"
};
const resTimeout = formatApiError(timeoutErr);
assert.strictEqual(typeof resTimeout, "string");
assert.ok(resTimeout.includes("timed out"));
console.log("5. Request timeout test: PASS ->", resTimeout);

// 6. Unknown object error
const unknownErr = { arbitrary: 123, nested: { value: true } };
const resUnknown = formatApiError(unknownErr, "Custom fallback message");
assert.strictEqual(typeof resUnknown, "string");
assert.strictEqual(resUnknown, "Custom fallback message");
console.log("6. Unknown object test: PASS ->", resUnknown);

console.log("=== ALL ERROR FORMATTER TESTS PASSED SUCCESSFULLY! ===");
