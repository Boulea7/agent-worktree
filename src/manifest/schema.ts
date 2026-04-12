import { z } from "zod";

import { ValidationError } from "../core/errors.js";
import { runtimeKinds, supportTiers } from "../core/capabilities.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  attemptVerificationStates,
  type AttemptManifest
} from "./types.js";
import {
  attemptVerificationCheckStatuses
} from "../verification/types.js";

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
    backend: z.string().trim().min(1),
    sessionId: z.string().trim().min(1)
  })
  .strict();

const attemptTimestampsSchema = z
  .object({
    createdAt: z.string().trim().min(1),
    updatedAt: z.string().trim().min(1)
  })
  .passthrough();

export const attemptManifestSchema = z
  .object({
    schemaVersion: z.string().trim().min(1),
    attemptId: z.string().trim().min(1),
    taskId: z.string().trim().min(1),
    runtime: z.enum(runtimeKinds),
    adapter: z.string().trim().min(1),
    sourceKind: z.enum(attemptSourceKinds).optional(),
    parentAttemptId: z.string().trim().min(1).optional(),
    repoRoot: z.string().trim().min(1).optional(),
    status: z.enum(attemptStatuses),
    verification: attemptVerificationSchema,
    supportTier: z.enum(supportTiers).optional(),
    baseRef: z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    worktreePath: z.string().trim().min(1).optional(),
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
