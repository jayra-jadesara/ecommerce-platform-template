/** Fixed recovery questions — no free-text questions. */
export const RECOVERY_QUESTIONS = [
  { id: "mother_maiden", label: "What is your mother's maiden name?" },
  { id: "first_school", label: "What was the name of your first school?" },
  { id: "birth_city", label: "In which city were you born?" },
  { id: "childhood_pet", label: "What was the name of your childhood pet?" },
] as const;

export type RecoveryQuestionId = (typeof RECOVERY_QUESTIONS)[number]["id"];

export const RECOVERY_QUESTION_IDS = RECOVERY_QUESTIONS.map((q) => q.id) as [
  RecoveryQuestionId,
  ...RecoveryQuestionId[],
];

export function isRecoveryQuestionId(value: string): value is RecoveryQuestionId {
  return (RECOVERY_QUESTION_IDS as readonly string[]).includes(value);
}

export function recoveryQuestionLabel(id: string | null | undefined): string | null {
  if (!id) return null;
  return RECOVERY_QUESTIONS.find((q) => q.id === id)?.label ?? null;
}
