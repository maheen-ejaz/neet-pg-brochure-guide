/** Rounds and stages of a national (MCC) counselling schedule. Shared by both schemas. */
export const ROUND_IDS = ["round-1", "round-2", "round-3", "stray"] as const;
export type RoundId = (typeof ROUND_IDS)[number];

export const STAGE_KEYS = [
  "seatMatrix",
  "registration",
  "payment",
  "choiceFilling",
  "choiceLocking",
  "processing",
  "result",
  "reporting",
  "dataVerification",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];
