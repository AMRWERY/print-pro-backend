export type Tier = "business" | "reseller" | "home";

export interface Account {
  id: string;
  name: string;
  studio: string;
  email: string;
  tier: Tier;
  newsletter: boolean;
  /** Job title shown on the profile. */
  title?: string;
  phone?: string;
  /** Per-account random salt (base64). */
  salt: string;
  /** PBKDF2-SHA256 of the password (base64). The password itself is never stored. */
  hash: string;
  createdAt: string;
}

export interface ResetToken {
  token: string;
  email: string;
  /** Epoch ms. */
  expires: number;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid" }
  | { ok: false; reason: "locked"; retryInSeconds: number };

export type Validatable = { validate: () => Promise<{ valid: boolean }> };