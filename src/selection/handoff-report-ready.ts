import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffConsumerReadiness,
  AttemptHandoffReportReady,
  AttemptHandoffReportReadyEntry,
  AttemptHandoffRequest,
  AttemptHandoffTarget,
  AttemptHandoffTargetApply,
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyBatch
} from "./types.js";

const ATTEMPT_HANDOFF_REPORT_READY_BASIS =
  "promotion_target_apply_batch" as const;
const ATTEMPT_HANDOFF_TARGET_BASIS = "promotion_target" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validBlockingReasons =
  new Set<AttemptHandoffConsumerBlockingReason>(["handoff_unsupported"]);

export function deriveAttemptHandoffReportReady(
  batch: AttemptPromotionTargetApplyBatch | undefined
): AttemptHandoffReportReady | undefined {
  if (batch === undefined) {
    return undefined;
  }

  if (!isRecord(batch)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires batch to be an object."
    );
  }

  validateBatch(batch);

  const results = batch.results.map(cloneEntry);

  return {
    reportBasis: ATTEMPT_HANDOFF_REPORT_READY_BASIS,
    results,
    invokedResults: results.filter((entry) => entry.targetApply.apply.consume.invoked),
    blockedResults: results.filter(
      (entry) => !entry.targetApply.apply.consume.invoked
    )
  };
}

function validateBatch(batch: AttemptPromotionTargetApplyBatch): void {
  if (!Array.isArray(batch.results)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires batch.results to be an array."
    );
  }

  batch.results.forEach(validatePromotionTargetApplyEntry);
}

function validatePromotionTargetApplyEntry(
  entry: AttemptPromotionTargetApply
): void {
  if (!isRecord(entry)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires each batch result to be an object."
    );
  }

  validateHandoffTarget(entry.handoffTarget);
  validateTargetApply(entry.targetApply);

  assertRequestMatchesTarget(
    entry.targetApply.request,
    entry.handoffTarget,
    "targetApply.request"
  );
  assertRequestMatchesTarget(
    entry.targetApply.apply.consumer.request,
    entry.handoffTarget,
    "targetApply.apply.consumer.request"
  );
  assertRequestMatchesTarget(
    entry.targetApply.apply.consume.request,
    entry.handoffTarget,
    "targetApply.apply.consume.request"
  );

  const consumerReadiness = entry.targetApply.apply.consumer.readiness;
  const consumeReadiness = entry.targetApply.apply.consume.readiness;

  validateReadiness(
    consumerReadiness,
    "targetApply.apply.consumer.readiness"
  );
  validateReadiness(consumeReadiness, "targetApply.apply.consume.readiness");

  if (!readinessEqual(consumerReadiness, consumeReadiness)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires consumer and consume readiness to match."
    );
  }

  if (typeof entry.targetApply.apply.consume.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff report-ready requires targetApply.apply.consume.invoked to be a boolean."
    );
  }

  if (entry.targetApply.apply.consume.invoked) {
    assertSupportedReadiness(consumerReadiness);
    return;
  }

  assertBlockedReadiness(consumerReadiness);
}

function validateHandoffTarget(target: AttemptHandoffTarget): void {
  if (!isRecord(target)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.handoffTarget to be an object."
    );
  }

  if (target.handoffBasis !== ATTEMPT_HANDOFF_TARGET_BASIS) {
    throw new ValidationError(
      'Attempt handoff report-ready requires entry.handoffTarget.handoffBasis to be "promotion_target".'
    );
  }

  validateTaskId(target.taskId, "entry.handoffTarget.taskId");
  validateNonEmptyString(
    target.attemptId,
    "Attempt handoff report-ready requires entry.handoffTarget.attemptId to be a non-empty string."
  );
  validateNonEmptyString(
    target.runtime,
    "Attempt handoff report-ready requires entry.handoffTarget.runtime to be a non-empty string."
  );
  validateAttemptStatus(target.status, "entry.handoffTarget.status");
  validateAttemptSourceKind(
    target.sourceKind,
    "entry.handoffTarget.sourceKind"
  );
}

function validateTargetApply(targetApply: AttemptHandoffTargetApply): void {
  if (!isRecord(targetApply)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.targetApply to be an object."
    );
  }

  validateRequest(targetApply.request, "entry.targetApply.request");

  if (!isRecord(targetApply.apply)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.targetApply.apply to be an object."
    );
  }

  if (!isRecord(targetApply.apply.consumer)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.targetApply.apply.consumer to be an object."
    );
  }

  validateRequest(
    targetApply.apply.consumer.request,
    "entry.targetApply.apply.consumer.request"
  );

  if (!isRecord(targetApply.apply.consume)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.targetApply.apply.consume to be an object."
    );
  }

  validateRequest(
    targetApply.apply.consume.request,
    "entry.targetApply.apply.consume.request"
  );
}

function validateRequest(
  request: AttemptHandoffRequest,
  fieldName: string
): void {
  if (!isRecord(request)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to be an object.`
    );
  }

  validateTaskId(request.taskId, `${fieldName}.taskId`);
  validateNonEmptyString(
    request.attemptId,
    `Attempt handoff report-ready requires ${fieldName}.attemptId to be a non-empty string.`
  );
  validateNonEmptyString(
    request.runtime,
    `Attempt handoff report-ready requires ${fieldName}.runtime to be a non-empty string.`
  );
  validateAttemptStatus(request.status, `${fieldName}.status`);
  validateAttemptSourceKind(request.sourceKind, `${fieldName}.sourceKind`);
}

function assertRequestMatchesTarget(
  request: AttemptHandoffRequest,
  target: AttemptHandoffTarget,
  fieldName: string
): void {
  if (
    normalizeComparableString(request.taskId) !==
      normalizeComparableString(target.taskId) ||
    normalizeComparableString(request.attemptId) !==
      normalizeComparableString(target.attemptId) ||
    normalizeComparableString(request.runtime) !==
      normalizeComparableString(target.runtime) ||
    request.status !== target.status ||
    request.sourceKind !== target.sourceKind
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to match entry.handoffTarget.`
    );
  }
}

function validateReadiness(
  readiness: AttemptHandoffConsumerReadiness,
  fieldName: string
): void {
  if (!isRecord(readiness)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to be an object.`
    );
  }

  if (!Array.isArray(readiness.blockingReasons)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.blockingReasons to be an array.`
    );
  }

  if (
    readiness.blockingReasons.some(
      (reason) => typeof reason !== "string" || !validBlockingReasons.has(reason)
    )
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.blockingReasons to use the existing handoff consumer blocker vocabulary.`
    );
  }

  validateBoolean(
    readiness.canConsumeHandoff,
    `${fieldName}.canConsumeHandoff`
  );
  validateBoolean(
    readiness.hasBlockingReasons,
    `${fieldName}.hasBlockingReasons`
  );
  validateBoolean(readiness.handoffSupported, `${fieldName}.handoffSupported`);

  if (
    readiness.canConsumeHandoff !==
    (readiness.blockingReasons.length === 0)
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.canConsumeHandoff to match whether blockingReasons is empty.`
    );
  }

  if (
    readiness.hasBlockingReasons !==
    (readiness.blockingReasons.length > 0)
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.hasBlockingReasons to match whether blockingReasons is non-empty.`
    );
  }

  if (readiness.handoffSupported !== readiness.canConsumeHandoff) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.handoffSupported to match ${fieldName}.canConsumeHandoff.`
    );
  }
}

function assertSupportedReadiness(
  readiness: AttemptHandoffConsumerReadiness
): void {
  if (
    readiness.blockingReasons.length !== 0 ||
    readiness.canConsumeHandoff !== true ||
    readiness.hasBlockingReasons !== false ||
    readiness.handoffSupported !== true
  ) {
    throw new ValidationError(
      "Attempt handoff report-ready requires invoked entries to use the canonical supported readiness shape."
    );
  }
}

function assertBlockedReadiness(
  readiness: AttemptHandoffConsumerReadiness
): void {
  if (
    readiness.blockingReasons.length === 0 ||
    readiness.canConsumeHandoff !== false ||
    readiness.hasBlockingReasons !== true ||
    readiness.handoffSupported !== false
  ) {
    throw new ValidationError(
      "Attempt handoff report-ready requires blocked entries to use the canonical blocked readiness shape."
    );
  }
}

function cloneEntry(
  entry: AttemptPromotionTargetApply
): AttemptHandoffReportReadyEntry {
  return {
    handoffTarget: cloneHandoffTarget(entry.handoffTarget),
    targetApply: cloneTargetApply(entry.targetApply)
  };
}

function cloneHandoffTarget(target: AttemptHandoffTarget): AttemptHandoffTarget {
  return {
    handoffBasis: target.handoffBasis,
    taskId: normalizeTaskId(target.taskId, "entry.handoffTarget.taskId"),
    attemptId: normalizeNonEmptyString(
      target.attemptId,
      "Attempt handoff report-ready requires entry.handoffTarget.attemptId to be a non-empty string."
    ),
    runtime: normalizeNonEmptyString(
      target.runtime,
      "Attempt handoff report-ready requires entry.handoffTarget.runtime to be a non-empty string."
    ),
    status: target.status,
    sourceKind: target.sourceKind
  };
}

function cloneTargetApply(
  targetApply: AttemptHandoffTargetApply
): AttemptHandoffTargetApply {
  return {
    request: cloneRequest(
      targetApply.request,
      "entry.targetApply.request"
    ),
    apply: {
      consumer: {
        request: cloneRequest(
          targetApply.apply.consumer.request,
          "entry.targetApply.apply.consumer.request"
        ),
        readiness: cloneReadiness(targetApply.apply.consumer.readiness)
      },
      consume: {
        request: cloneRequest(
          targetApply.apply.consume.request,
          "entry.targetApply.apply.consume.request"
        ),
        readiness: cloneReadiness(targetApply.apply.consume.readiness),
        invoked: targetApply.apply.consume.invoked
      }
    }
  };
}

function cloneRequest(
  request: AttemptHandoffRequest,
  fieldPath: string
): AttemptHandoffRequest {
  return {
    taskId: normalizeTaskId(request.taskId, `${fieldPath}.taskId`),
    attemptId: normalizeNonEmptyString(
      request.attemptId,
      `Attempt handoff report-ready requires ${fieldPath}.attemptId to be a non-empty string.`
    ),
    runtime: normalizeNonEmptyString(
      request.runtime,
      `Attempt handoff report-ready requires ${fieldPath}.runtime to be a non-empty string.`
    ),
    status: request.status,
    sourceKind: request.sourceKind
  };
}

function cloneReadiness(
  readiness: AttemptHandoffConsumerReadiness
): AttemptHandoffConsumerReadiness {
  return {
    blockingReasons: [...readiness.blockingReasons],
    canConsumeHandoff: readiness.canConsumeHandoff,
    hasBlockingReasons: readiness.hasBlockingReasons,
    handoffSupported: readiness.handoffSupported
  };
}

function readinessEqual(
  left: AttemptHandoffConsumerReadiness,
  right: AttemptHandoffConsumerReadiness
): boolean {
  return (
    left.canConsumeHandoff === right.canConsumeHandoff &&
    left.hasBlockingReasons === right.hasBlockingReasons &&
    left.handoffSupported === right.handoffSupported &&
    left.blockingReasons.length === right.blockingReasons.length &&
    left.blockingReasons.every((value, index) => value === right.blockingReasons[index])
  );
}

function validateTaskId(value: unknown, fieldName: string): void {
  normalizeTaskId(value, fieldName);
}

function validateNonEmptyString(
  value: unknown,
  errorMessage: string
): void {
  normalizeNonEmptyString(value, errorMessage);
}

function normalizeTaskId(value: unknown, fieldName: string): string {
  return normalizeNonEmptyString(
    value,
    `Attempt handoff report-ready requires ${fieldName} to be a non-empty string.`
  );
}

function normalizeNonEmptyString(value: unknown, errorMessage: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(errorMessage);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(errorMessage);
  }

  return normalized;
}

function normalizeComparableString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to use the existing attempt status vocabulary.`
    );
  }
}

function validateAttemptSourceKind(value: unknown, fieldName: string): void {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to be a boolean.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
