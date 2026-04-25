import { z } from "zod";

export const SessionCode = z
  .string()
  .trim()
  .min(3, "Code is too short")
  .max(12, "Code is too long")
  .transform((s) => s.toUpperCase())
  .refine((s) => /^[A-Z0-9]+$/.test(s), {
    message: "Letters and numbers only",
  });

export const PlayerName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(30, "Name is too long");

export const HostName = z
  .string()
  .trim()
  .max(30, "Name is too long");

export const Answer = z
  .string()
  .trim()
  .min(1, "Answer cannot be empty")
  .max(500, "Answer is too long (500 characters max)");

// Each slot is optional — a player may answer 1, 2, or 3 questions. Empty
// strings get filtered out before insert.
export const OptionalAnswer = z
  .string()
  .trim()
  .max(500, "Answer is too long (500 characters max)");

export const Question = z
  .string()
  .trim()
  .min(1, "Question cannot be empty")
  .max(300, "Question is too long");

export const Questions = z.tuple([Question, Question, Question]);

export const Token = z.string().min(20).max(80);

export const CreateSessionInput = z.object({
  code: SessionCode,
  hostName: HostName.optional().default(""),
  questions: Questions,
});

export const JoinSessionInput = z.object({
  code: SessionCode,
  name: PlayerName,
});

export const SubmitAnswersInput = z.object({
  code: SessionCode,
  playerId: z.string().uuid(),
  playerToken: Token,
  answers: z
    .tuple([OptionalAnswer, OptionalAnswer, OptionalAnswer])
    .refine((arr) => arr.some((a) => a.length > 0), {
      message: "Answer at least one question.",
    }),
});

export const HostActionInput = z.object({
  code: SessionCode,
  hostToken: Token,
});

export const SubmitGuessInput = z.object({
  code: SessionCode,
  playerId: z.string().uuid(),
  playerToken: Token,
  cardId: z.string().uuid(),
  guessedPlayerId: z.string().uuid(),
});

export type CreateSessionInputType = z.infer<typeof CreateSessionInput>;
export type JoinSessionInputType = z.infer<typeof JoinSessionInput>;
export type SubmitAnswersInputType = z.infer<typeof SubmitAnswersInput>;

export const friendlyZodError = (err: z.ZodError): string => {
  const first = err.issues[0];
  return first?.message ?? "Something didn't look right.";
};
