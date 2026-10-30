// vee-validate rule functions for the settings screen. Same contract as validators.ts:
// `true` when valid, otherwise a message that says how to fix it.

type Rule = (value: unknown) => true | string;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Only checked when something is typed. */
const optional =
  (rule: Rule): Rule =>
  (v) =>
    text(v) ? rule(v) : true;

export const phoneOptionalRule: Rule = optional((v) =>
  /^\+?[0-9 ()-]{6,24}$/.test(text(v))
    ? true
    : "Use a phone number like +41 44 214 88 00.",
);

export const phoneRequiredRule: Rule = (v) =>
  text(v) ? phoneOptionalRule(v) : "Enter the desk's phone number.";

export const ibanRule =
  (required: () => boolean): Rule =>
  (v) => {
    const s = text(v).replace(/\s+/g, "").toUpperCase();
    if (!s) return required() ? "Enter the IBAN the wires are paid to." : true;
    return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)
      ? true
      : "That IBAN looks wrong. It starts with two letters and two digits, e.g. DE89 3704 0044 0532 0130 00.";
  };

export const bicRule =
  (required: () => boolean): Rule =>
  (v) => {
    const s = text(v).toUpperCase();
    if (!s) return required() ? "Enter the bank's BIC / SWIFT code." : true;
    return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(s)
      ? true
      : "A BIC has 8 or 11 characters, e.g. DEUTDEFF or DEUTDEFFXXX.";
  };

export const httpsUrlRule: Rule = optional((v) =>
  /^https:\/\/[^\s/]+\.[^\s]+$/.test(text(v))
    ? true
    : "Use a secure address starting with https://.",
);

export const hostRule: Rule = (v) =>
  /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text(v))
    ? true
    : "Enter a host name like smtp.example.com.";

export const orderPrefixRule: Rule = (v) =>
  /^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/.test(text(v))
    ? true
    : "Use up to 16 letters, numbers or dashes, e.g. LP-2026-.";

/** One IPv4 address or CIDR range per line. */
export const cidrListRule: Rule = (v) => {
  const lines = String(v ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 50) return "Keep the list to 50 ranges or fewer.";
  const bad = lines.find(
    (l) =>
      !/^(\d{1,3})(\.\d{1,3}){3}(\/(\d|[12]\d|3[0-2]))?$/.test(l) ||
      l
        .split("/")[0]!
        .split(".")
        .some((o) => Number(o) > 255),
  );
  return bad
    ? `"${bad}" is not a valid address or range. Use one per line, e.g. 196.218.0.0/16.`
    : true;
};
