const CUSTOMER_TYPES = new Set(["retail", "diy", "wholesale"]);

export function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return Number.NaN;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

/**
 * Validate user-entered order data and create the canonical RPC payload.
 * The database recalculates every line and the order total again in a transaction.
 */
export function prepareOrderPayload(draft) {
  if (!CUSTOMER_TYPES.has(draft?.custType)) {
    return { ok: false, error: "กรุณาเลือกประเภทลูกค้า" };
  }

  if (!Array.isArray(draft.lines) || draft.lines.length === 0) {
    return { ok: false, error: "เพิ่มรายการสินค้าอย่างน้อย 1 รายการ" };
  }

  const lines = [];
  for (const [index, line] of draft.lines.entries()) {
    const lineNumber = index + 1;
    const partName = String(line?.partName ?? "").trim();
    if (line?.qty === "" || line?.qty === null || line?.qty === undefined) {
      return { ok: false, error: `รายการที่ ${lineNumber}: กรุณาระบุจำนวน` };
    }
    const qty = Number(line?.qty);
    if (line?.unitPrice === "" || line?.unitPrice === null || line?.unitPrice === undefined) {
      return { ok: false, error: `รายการที่ ${lineNumber}: กรุณาระบุราคา` };
    }
    const unitPrice = Number(line?.unitPrice);

    if (!partName) {
      return { ok: false, error: `รายการที่ ${lineNumber}: กรุณาระบุชื่อสินค้า` };
    }
    if (!Number.isSafeInteger(qty) || qty < 1) {
      return { ok: false, error: `รายการที่ ${lineNumber}: จำนวนต้องเป็นจำนวนเต็มอย่างน้อย 1` };
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: `รายการที่ ${lineNumber}: ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป` };
    }

    const roundedUnitPrice = roundMoney(unitPrice);
    lines.push({
      partName,
      qty,
      unitPrice: roundedUnitPrice,
      total: roundMoney(qty * roundedUnitPrice),
      note: String(line?.note ?? "").trim(),
    });
  }

  const paidAmount = Number(draft.paidAmount ?? 0);
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    return { ok: false, error: "ยอดรับชำระต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" };
  }

  return {
    ok: true,
    value: {
      custType: draft.custType,
      custName: String(draft.custName ?? "").trim() || "—",
      bikeBrand: String(draft.bikeBrand ?? "").trim() || "—",
      paidAmount: roundMoney(paidAmount),
      total: roundMoney(lines.reduce((sum, line) => sum + line.total, 0)),
      lines,
    },
  };
}
