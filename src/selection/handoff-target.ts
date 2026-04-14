import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffTarget,
  AttemptPromotionTarget
} from "./types.js";
import {
  accessSelectionValue,
  rethrowSelectionAccessError
} from "./entry-validation.js";

const ATTEMPT_PROMOTION_TARGET_BASIS = "promotion_decision_summary" as const;
const ATTEMPT_HANDOFF_TARGET_BASIS = "promotion_target" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffTarget(
  target: AttemptPromotionTarget | undefined
): AttemptHandoffTarget | undefined {
  if (target === undefined) {
    return undefined;
  }

  if (!isRecord(target)) {
    throw new ValidationError(
      "Attempt handoff target requires target to be an object when provided."
    );
  }

  try {
    validateTargetBasis(target);
    const taskId = normalizeRequiredString(
      accessSelectionValue(target, "taskId"),
      "target.taskId"
    );
    const attemptId = normalizeRequiredString(
      accessSelectionValue(target, "attemptId"),
      "target.attemptId"
    );
    const runtime = normalizeRequiredString(
      accessSelectionValue(target, "runtime"),
      "target.runtime"
    );
    const status = accessSelectionValue(target, "status");
    const sourceKind = accessSelectionValue(target, "sourceKind");
    validateAttemptStatus(status);
    validateAttemptSourceKind(sourceKind);

    return {
      handoffBasis: ATTEMPT_HANDOFF_TARGET_BASIS,
      taskId,
      attemptId,
      runtime,
      status: status as AttemptStatus,
      sourceKind: sourceKind as AttemptSourceKind | undefined
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff target requires target to be a readable object when provided."
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateTargetBasis(target: AttemptPromotionTarget): void {
  if (
    accessSelectionValue(target, "targetBasis") !== ATTEMPT_PROMOTION_TARGET_BASIS
  ) {
    throw new ValidationError(
      'Attempt handoff target requires target.targetBasis to be "promotion_decision_summary".'
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff target requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff target requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt handoff target requires target.status to use the existing attempt status vocabulary."
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
      "Attempt handoff target requires target.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}
