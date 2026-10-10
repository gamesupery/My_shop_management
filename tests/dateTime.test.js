import test from "node:test";
import assert from "node:assert/strict";
import { formatShopDate, formatShopDateTime, shopISODate } from "../src/dateTime.js";

test("uses the Bangkok calendar date when UTC time crosses midnight", () => {
  const timestamp = "2026-10-10T17:00:00.000Z";
  assert.equal(shopISODate(timestamp), "2026-10-11");
  assert.equal(formatShopDate(timestamp), "11/10/2569");
  assert.equal(formatShopDateTime(timestamp), "11/10/2569 · 00:00 น.");
});

test("keeps the last minute of the Bangkok day on the same date", () => {
  const timestamp = "2026-10-10T16:59:00.000Z";
  assert.equal(shopISODate(timestamp), "2026-10-10");
  assert.equal(formatShopDateTime(timestamp), "10/10/2569 · 23:59 น.");
});

test("interprets Supabase UTC timestamps without an offset as UTC", () => {
  const timestamp = "2026-10-10 17:00:00.123456";
  assert.equal(shopISODate(timestamp), "2026-10-11");
  assert.equal(formatShopDateTime(timestamp), "11/10/2569 · 00:00 น.");
});

test("handles invalid timestamps without showing Invalid Date", () => {
  assert.equal(shopISODate("not-a-date"), "");
  assert.equal(formatShopDate("not-a-date"), "—");
  assert.equal(formatShopDateTime("not-a-date"), "—");
});
