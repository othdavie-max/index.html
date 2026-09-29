import type { CountryCode } from "libphonenumber-js";
import { normalizePhone } from "./phone";

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF, embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export type ImportRow = {
  full_name: string;
  phone: string; // E.164
  email: string | null;
  country: string | null;
  city: string | null;
  notes: string | null;
};

export type ImportPlan = {
  toCreate: ImportRow[];
  /** Phone already in the database (or earlier in the same file). */
  duplicates: { line: number; phone: string; full_name: string; reason: "existing lead" | "repeated in file" }[];
  invalid: { line: number; reason: string; raw: string }[];
  totalRows: number;
};

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  full_name: ["name", "full name", "fullname", "full_name", "contact", "contact name"],
  phone: ["phone", "phone number", "mobile", "mobile number", "whatsapp", "tel", "telephone", "number", "phone_number"],
  email: ["email", "e-mail", "email address"],
  country: ["country"],
  city: ["city", "town", "location"],
  notes: ["notes", "note", "comment", "comments", "remarks"],
};

function mapHeaders(header: string[]): Partial<Record<keyof ImportRow, number>> {
  const idx: Partial<Record<keyof ImportRow, number>> = {};
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    for (const field of Object.keys(HEADER_ALIASES) as (keyof ImportRow)[]) {
      if (idx[field] === undefined && (key === field || HEADER_ALIASES[field].includes(key))) idx[field] = i;
    }
  });
  return idx;
}

/**
 * Turn CSV text into an import plan. Duplicates are detected by normalised phone
 * number, against `existingPhones` (already in the DB) and within the file itself,
 * so "+234 803 123 4567" and "08031234567" are the same lead.
 */
export function planImport(csvText: string, existingPhones: Set<string>, defaultCountry: CountryCode = "NG"): ImportPlan {
  const rows = parseCsv(csvText);
  const plan: ImportPlan = { toCreate: [], duplicates: [], invalid: [], totalRows: 0 };
  if (rows.length === 0) return plan;
  const cols = mapHeaders(rows[0]);
  if (cols.phone === undefined) {
    plan.invalid.push({ line: 1, reason: 'No phone column found (expected a header like "phone" or "mobile")', raw: rows[0].join(",") });
    return plan;
  }
  const seen = new Set<string>();
  const get = (r: string[], k: keyof ImportRow) => (cols[k] !== undefined ? (r[cols[k]!] ?? "").trim() : "");

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    plan.totalRows++;
    const phone = normalizePhone(get(r, "phone"), defaultCountry);
    if (!phone) {
      plan.invalid.push({ line, reason: "Invalid or missing phone number", raw: r.join(",") });
      return;
    }
    const full_name = get(r, "full_name") || "Unknown";
    if (existingPhones.has(phone)) plan.duplicates.push({ line, phone, full_name, reason: "existing lead" });
    else if (seen.has(phone)) plan.duplicates.push({ line, phone, full_name, reason: "repeated in file" });
    else {
      seen.add(phone);
      plan.toCreate.push({
        full_name, phone,
        email: get(r, "email") || null,
        country: get(r, "country") || null,
        city: get(r, "city") || null,
        notes: get(r, "notes") || null,
      });
    }
  });
  return plan;
}
