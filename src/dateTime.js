const SHOP_TIME_ZONE = "Asia/Bangkok";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA-u-nu-latn", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const thaiDateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function asDate(value) {
  // Supabase returns this column without an offset. Its database default is
  // now() on a UTC session, so parse that wall-clock value as UTC explicitly.
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/);
    if (match) {
      const fraction = match[3] ? `.${match[3].slice(1).padEnd(3, "0").slice(0, 3)}` : "";
      value = `${match[1]}T${match[2]}${fraction}Z`;
    }
  }
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? null : date;
}

function parts(formatter, date) {
  return Object.fromEntries(
    formatter.formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(({ type, value }) => [type, value])
  );
}

export function shopISODate(value = new Date()) {
  const date = asDate(value);
  if (!date) return "";
  const dateParts = parts(isoDateFormatter, date);
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function formatShopDate(value = new Date()) {
  const date = asDate(value);
  if (!date) return "—";
  const dateParts = parts(thaiDateFormatter, date);
  return `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
}

export function formatShopDateTime(value) {
  const date = asDate(value);
  if (!date) return "—";
  const dateParts = parts(thaiDateTimeFormatter, date);
  return `${dateParts.day}/${dateParts.month}/${dateParts.year} · ${dateParts.hour}:${dateParts.minute} น.`;
}
