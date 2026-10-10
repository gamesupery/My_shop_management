import assert from "node:assert/strict";
import test from "node:test";
import { prepareOrderPayload, roundMoney } from "../src/orderLogic.js";

const validDraft = {
  custType: "retail",
  custName: "ลูกค้าทดสอบ",
  bikeBrand: "รถทดสอบ",
  paidAmount: 50,
  lines: [{ partName: "หัวเทียน", qty: 2, unitPrice: 85, total: 999, note: "" }],
};

test("roundMoney normalizes currency to two decimal places", () => {
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(12.2), 12.2);
});

test("prepareOrderPayload recalculates line and order totals instead of trusting client totals", () => {
  const result = prepareOrderPayload(validDraft);
  assert.equal(result.ok, true);
  assert.equal(result.value.total, 170);
  assert.equal(result.value.lines[0].total, 170);
  assert.equal(result.value.lines[0].partName, "หัวเทียน");
});

test("prepareOrderPayload trims names and uses safe optional-field defaults", () => {
  const result = prepareOrderPayload({
    ...validDraft,
    custName: "   ",
    bikeBrand: "",
    lines: [{ partName: "  หัวเทียน  ", qty: 1, unitPrice: 85 }],
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.custName, "—");
  assert.equal(result.value.bikeBrand, "—");
  assert.equal(result.value.lines[0].partName, "หัวเทียน");
});

test("prepareOrderPayload rejects unsupported customer types and empty orders", () => {
  assert.match(prepareOrderPayload({ ...validDraft, custType: "unknown" }).error, /ประเภทลูกค้า/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [] }).error, /อย่างน้อย 1 รายการ/);
});

test("prepareOrderPayload rejects blank item names, fractional/zero quantity and negative prices", () => {
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], partName: " " }] }).error, /ชื่อสินค้า/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], qty: "" }] }).error, /จำนวน/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], qty: 0 }] }).error, /จำนวน/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], qty: 1.5 }] }).error, /จำนวน/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], unitPrice: "" }] }).error, /ราคา/);
  assert.match(prepareOrderPayload({ ...validDraft, lines: [{ ...validDraft.lines[0], unitPrice: -1 }] }).error, /ราคา/);
});

test("prepareOrderPayload rejects negative or non-numeric payment", () => {
  assert.match(prepareOrderPayload({ ...validDraft, paidAmount: -1 }).error, /ยอดรับชำระ/);
  assert.match(prepareOrderPayload({ ...validDraft, paidAmount: "not-a-number" }).error, /ยอดรับชำระ/);
});
