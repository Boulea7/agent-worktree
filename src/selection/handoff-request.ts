import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffRequest,
  AttemptHandoffTarget
} from "./types.js";

const ATTEMPT_HANDOFF_TARGET_BASIS = "promotion_target" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffRequest(
  target: AttemptHandoffTarget | undefined
): AttemptHandoffRequest | undefined {
  if (target === undefined) {
    return undefined;
  }

  validateTargetBasis(target);
  validateTaskId(target.taskId);
  validateNonEmptyString(target.attemptId, "target.attemptId");
  validateNonEmptyString(target.runtime, "target.runtime");
  validateAttemptStatus(target.status);
  validateAttemptSourceKind(target.sourceKind);

  return {
    taskId: target.taskId,
    attemptId: target.attemptId,
    runtime: target.runtime,
    status: target.status,
    sourceKind: target.sourceKind
  };
}

function validateTargetBasis(target: AttemptHandoffTarget): void {
  if (target.handoffBasis !== ATTEMPT_HANDOFF_TARGET_BASIS) {
    throw new ValidationError(
      'Attempt handoff request requires target.handoffBasis to be "promotion_target".'
    );
  }
}

function validateTaskId(value: unknown): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      "Attempt handoff request requires target.taskId to be a non-empty string."
    );
  }
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff request requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt handoff request requires target.status to use the existing attempt status vocabulary."
    );
  }
}

function validateAttemptSourceKind(value: unknown): void {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      "Attempt handoff request requires target.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}
