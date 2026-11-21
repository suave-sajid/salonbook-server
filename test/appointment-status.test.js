import assert from "node:assert/strict";
import test from "node:test";
import { getAllowedPreviousStatuses } from "../src/utils/appointment-status.js";

test("admin can confirm only pending appointments", () => {
  assert.deepEqual(getAllowedPreviousStatuses("confirmed"), ["pending"]);
});

test("admin can cancel pending or confirmed appointments", () => {
  assert.deepEqual(getAllowedPreviousStatuses("cancelled"), ["pending", "confirmed"]);
});

test("unknown appointment transitions are rejected", () => {
  assert.deepEqual(getAllowedPreviousStatuses("paid"), []);
  assert.deepEqual(getAllowedPreviousStatuses("pending"), []);
});
