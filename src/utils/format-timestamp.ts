/** "2026-10-31T14:22:08.000Z" → "2026-10-31 14:22:08 UTC" (ledger timestamps are always UTC). */
export const formatUtc = (iso: string) =>
  `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
