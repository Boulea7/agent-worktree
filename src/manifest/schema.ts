import { z } from "zod";

import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptManifest
} from "./types.js";
import {
  attemptVerificationCheckStatuses
} from "../verification/types.js";

const attemptVerificationStates = [
  "pending",
  "passed",
  "verified",
  "failed",
  "error"
] as const;

const attemptVerificationCheckSchema = z.object({
  name: z.string().trim().min(1),
  status: z.enum(attemptVerificationCheckStatuses),
  required: z.boolean().optional()
});

const attemptVerificationSchema = z
  .object({
    state: z.enum(attemptVerificationStates),
    checks: z.array(attemptVerificationCheckSchema)
  })
  .passthrough();

const attemptSessionSchema = z
  .object({
    backend: z.string(),
    sessionId: z.string()
  })
  .passthrough();

const attemptTimestampsSchema = z
  .object({
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .passthrough();

export const attemptManifestSchema = z
  .object({
    schemaVersion: z.string(),
    attemptId: z.string().trim().min(1),
    taskId: z.string(),
    runtime: z.string(),
    adapter: z.string(),
    sourceKind: z.enum(attemptSourceKinds).optional(),
    parentAttemptId: z.string().trim().min(1).optional(),
    repoRoot: z.string().optional(),
    status: z.enum(attemptStatuses),
    verification: attemptVerificationSchema,
    supportTier: z.string().optional(),
    baseRef: z.string().optional(),
    branch: z.string().optional(),
    worktreePath: z.string().optional(),
    session: attemptSessionSchema.optional(),
    artifacts: z.array(z.unknown()).optional(),
    timestamps: attemptTimestampsSchema.optional()
  })
  .superRefine((manifest, context) => {
    if (manifest.sourceKind === undefined) {
      if (manifest.parentAttemptId !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "parentAttemptId requires sourceKind to be present in the manifest.",
          path: ["parentAttemptId"]
        });
      }
      return;
    }

    if (manifest.sourceKind === "direct") {
      if (manifest.parentAttemptId !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Direct attempts must not record parentAttemptId in the manifest.",
          path: ["parentAttemptId"]
        });
      }
      return;
    }

    if (manifest.parentAttemptId === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Non-direct attempts must record a non-empty parentAttemptId in the manifest.",
        path: ["parentAttemptId"]
      });
      return;
    }

    if (manifest.parentAttemptId === manifest.attemptId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "parentAttemptId must not match attemptId.",
        path: ["parentAttemptId"]
      });
    }
  })
  .passthrough();

export function parseManifest(input: unknown): AttemptManifest {
  const result = attemptManifestSchema.safeParse(input);

  if (!result.success) {
    throw new ValidationError("Invalid attempt manifest.", result.error);
  }

  return result.data as AttemptManifest;
}

export const parseAttemptManifest = parseManifest;
