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
import { readSelectionValue } from "./entry-validation.js";
import {
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "./downstream-identity-guardrails.js";

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

  const results = validateBatch(batch);
  validateDownstreamSingleTaskBoundary(
    results.map((entry) => entry.handoffTarget),
    "Attempt handoff report-ready requires batch.results from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    results.map((entry) => entry.handoffTarget),
    "Attempt handoff report-ready requires batch.results to use unique (taskId, attemptId, runtime) identities."
  );

  return {
    reportBasis: ATTEMPT_HANDOFF_REPORT_READY_BASIS,
    results,
    invokedResults: results.filter((entry) => entry.targetApply.apply.consume.invoked),
    blockedResults: results.filter(
      (entry) => !entry.targetApply.apply.consume.invoked
    )
  };
}

function validateBatch(
  batch: AttemptPromotionTargetApplyBatch
): AttemptHandoffReportReadyEntry[] {
  const results = readSelectionValue(
    batch,
    "results",
    "Attempt handoff report-ready requires batch.results to be an array."
  );

  if (!Array.isArray(results)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires batch.results to be an array."
    );
  }

  const normalizedEntries: AttemptHandoffReportReadyEntry[] = [];

  for (let index = 0; index < results.length; index += 1) {
    if (!hasOwnIndex(results, index)) {
      throw new ValidationError(
        "Attempt handoff report-ready requires each batch result to be an object."
      );
    }

    let entry: unknown;

    try {
      entry = results[index];
    } catch {
      throw new ValidationError(
        "Attempt handoff report-ready requires each batch result to be an object."
      );
    }

    normalizedEntries.push(validatePromotionTargetApplyEntry(entry));
  }

  return normalizedEntries;
}

function validatePromotionTargetApplyEntry(
  entry: unknown
): AttemptHandoffReportReadyEntry {
  if (!isRecord(entry)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires each batch result to be an object."
    );
  }

  const handoffTarget = validateHandoffTarget(
    readSelectionValue(
      entry,
      "handoffTarget",
      "Attempt handoff report-ready requires entry.handoffTarget to be an object."
    )
  );
  const targetApply = validateTargetApply(
    readSelectionValue(
      entry,
      "targetApply",
      "Attempt handoff report-ready requires entry.targetApply to be an object."
    )
  );

  assertRequestMatchesTarget(
    targetApply.request,
    handoffTarget,
    "targetApply.request"
  );
  assertRequestMatchesTarget(
    targetApply.apply.consumer.request,
    handoffTarget,
    "targetApply.apply.consumer.request"
  );
  assertRequestMatchesTarget(
    targetApply.apply.consume.request,
    handoffTarget,
    "targetApply.apply.consume.request"
  );

  const consumerReadiness = targetApply.apply.consumer.readiness;
  const consumeReadiness = targetApply.apply.consume.readiness;

  if (!readinessEqual(consumerReadiness, consumeReadiness)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires consumer and consume readiness to match."
    );
  }

  if (targetApply.apply.consume.invoked) {
    assertSupportedReadiness(consumerReadiness);
  } else {
    assertBlockedReadiness(consumerReadiness);
  }

  return {
    handoffTarget,
    targetApply
  };
}

function validateHandoffTarget(target: unknown): AttemptHandoffTarget {
  if (!isRecord(target)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.handoffTarget to be an object."
    );
  }

  const handoffBasis = readSelectionValue(
    target,
    "handoffBasis",
    'Attempt handoff report-ready requires entry.handoffTarget.handoffBasis to be "promotion_target".'
  );

  if (handoffBasis !== ATTEMPT_HANDOFF_TARGET_BASIS) {
    throw new ValidationError(
      'Attempt handoff report-ready requires entry.handoffTarget.handoffBasis to be "promotion_target".'
    );
  }

  const taskId = normalizeTaskId(
    readSelectionValue(
      target,
      "taskId",
      "Attempt handoff report-ready requires entry.handoffTarget.taskId to be a non-empty string."
    ),
    "entry.handoffTarget.taskId"
  );
  const attemptId = normalizeNonEmptyString(
    readSelectionValue(
      target,
      "attemptId",
      "Attempt handoff report-ready requires entry.handoffTarget.attemptId to be a non-empty string."
    ),
    "Attempt handoff report-ready requires entry.handoffTarget.attemptId to be a non-empty string."
  );
  const runtime = normalizeNonEmptyString(
    readSelectionValue(
      target,
      "runtime",
      "Attempt handoff report-ready requires entry.handoffTarget.runtime to be a non-empty string."
    ),
    "Attempt handoff report-ready requires entry.handoffTarget.runtime to be a non-empty string."
  );
  const status = readSelectionValue(
    target,
    "status",
    "Attempt handoff report-ready requires entry.handoffTarget.status to use the existing attempt status vocabulary."
  );
  validateAttemptStatus(status, "entry.handoffTarget.status");
  const sourceKind = readSelectionValue(
    target,
    "sourceKind",
    "Attempt handoff report-ready requires entry.handoffTarget.sourceKind to use the existing attempt source-kind vocabulary when provided."
  );
  validateAttemptSourceKind(
    sourceKind,
    "entry.handoffTarget.sourceKind"
  );

  return {
    handoffBasis: ATTEMPT_HANDOFF_TARGET_BASIS,
    taskId,
    attemptId,
    runtime,
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined
  };
}

function validateTargetApply(targetApply: unknown): AttemptHandoffTargetApply {
  if (!isRecord(targetApply)) {
    throw new ValidationError(
      "Attempt handoff report-ready requires entry.targetApply to be an object."
    );
  }

  const request = validateRequest(
    readSelectionValue(
      targetApply,
      "request",
      "Attempt handoff report-ready requires entry.targetApply.request to be an object."
    ),
    "entry.targetApply.request"
  );
  const apply = readSelectionObject(
    targetApply,
    "apply",
    "Attempt handoff report-ready requires entry.targetApply.apply to be an object."
  );
  const consumer = readSelectionObject(
    apply,
    "consumer",
    "Attempt handoff report-ready requires entry.targetApply.apply.consumer to be an object."
  );
  const consume = readSelectionObject(
    apply,
    "consume",
    "Attempt handoff report-ready requires entry.targetApply.apply.consume to be an object."
  );
  const consumerRequest = validateRequest(
    readSelectionValue(
      consumer,
      "request",
      "Attempt handoff report-ready requires entry.targetApply.apply.consumer.request to be an object."
    ),
    "entry.targetApply.apply.consumer.request"
  );
  const consumerReadiness = validateReadiness(
    readSelectionValue(
      consumer,
      "readiness",
      "Attempt handoff report-ready requires targetApply.apply.consumer.readiness to be an object."
    ),
    "targetApply.apply.consumer.readiness"
  );
  const consumeRequest = validateRequest(
    readSelectionValue(
      consume,
      "request",
      "Attempt handoff report-ready requires entry.targetApply.apply.consume.request to be an object."
    ),
    "entry.targetApply.apply.consume.request"
  );
  const consumeReadiness = validateReadiness(
    readSelectionValue(
      consume,
      "readiness",
      "Attempt handoff report-ready requires targetApply.apply.consume.readiness to be an object."
    ),
    "targetApply.apply.consume.readiness"
  );
  const invoked = readSelectionValue(
    consume,
    "invoked",
    "Attempt handoff report-ready requires targetApply.apply.consume.invoked to be a boolean."
  );

  if (typeof invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff report-ready requires targetApply.apply.consume.invoked to be a boolean."
    );
  }

  return {
    request,
    apply: {
      consumer: {
        request: consumerRequest,
        readiness: consumerReadiness
      },
      consume: {
        request: consumeRequest,
        readiness: consumeReadiness,
        invoked
      }
    }
  };
}

function validateRequest(
  request: unknown,
  fieldName: string
): AttemptHandoffRequest {
  if (!isRecord(request)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to be an object.`
    );
  }

  const taskId = normalizeTaskId(
    readSelectionValue(
      request,
      "taskId",
      `Attempt handoff report-ready requires ${fieldName}.taskId to be a non-empty string.`
    ),
    `${fieldName}.taskId`
  );
  const attemptId = normalizeNonEmptyString(
    readSelectionValue(
      request,
      "attemptId",
      `Attempt handoff report-ready requires ${fieldName}.attemptId to be a non-empty string.`
    ),
    `Attempt handoff report-ready requires ${fieldName}.attemptId to be a non-empty string.`
  );
  const runtime = normalizeNonEmptyString(
    readSelectionValue(
      request,
      "runtime",
      `Attempt handoff report-ready requires ${fieldName}.runtime to be a non-empty string.`
    ),
    `Attempt handoff report-ready requires ${fieldName}.runtime to be a non-empty string.`
  );
  const status = readSelectionValue(
    request,
    "status",
    `Attempt handoff report-ready requires ${fieldName}.status to use the existing attempt status vocabulary.`
  );
  validateAttemptStatus(status, `${fieldName}.status`);
  const sourceKind = readSelectionValue(
    request,
    "sourceKind",
    `Attempt handoff report-ready requires ${fieldName}.sourceKind to use the existing attempt source-kind vocabulary when provided.`
  );
  validateAttemptSourceKind(sourceKind, `${fieldName}.sourceKind`);

  return {
    taskId,
    attemptId,
    runtime,
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined
  };
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
  readiness: unknown,
  fieldName: string
): AttemptHandoffConsumerReadiness {
  if (!isRecord(readiness)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName} to be an object.`
    );
  }

  const blockingReasons = readSelectionValue(
    readiness,
    "blockingReasons",
    `Attempt handoff report-ready requires ${fieldName}.blockingReasons to be an array.`
  );

  if (!Array.isArray(blockingReasons)) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.blockingReasons to be an array.`
    );
  }

  for (let index = 0; index < blockingReasons.length; index += 1) {
    let blockingReason: unknown;

    try {
      blockingReason = blockingReasons[index];
    } catch {
      throw new ValidationError(
        `Attempt handoff report-ready requires ${fieldName}.blockingReasons to use the existing handoff consumer blocker vocabulary.`
      );
    }

    if (
      !hasOwnIndex(blockingReasons, index) ||
      typeof blockingReason !== "string" ||
      !validBlockingReasons.has(
        blockingReason as AttemptHandoffConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `Attempt handoff report-ready requires ${fieldName}.blockingReasons to use the existing handoff consumer blocker vocabulary.`
      );
    }
  }

  const canConsumeHandoff = readSelectionValue(
    readiness,
    "canConsumeHandoff",
    `Attempt handoff report-ready requires ${fieldName}.canConsumeHandoff to be a boolean.`
  );
  validateBoolean(
    canConsumeHandoff,
    `${fieldName}.canConsumeHandoff`
  );
  const hasBlockingReasons = readSelectionValue(
    readiness,
    "hasBlockingReasons",
    `Attempt handoff report-ready requires ${fieldName}.hasBlockingReasons to be a boolean.`
  );
  validateBoolean(
    hasBlockingReasons,
    `${fieldName}.hasBlockingReasons`
  );
  const handoffSupported = readSelectionValue(
    readiness,
    "handoffSupported",
    `Attempt handoff report-ready requires ${fieldName}.handoffSupported to be a boolean.`
  );
  validateBoolean(handoffSupported, `${fieldName}.handoffSupported`);

  if (
    canConsumeHandoff !==
    (blockingReasons.length === 0)
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.canConsumeHandoff to match whether blockingReasons is empty.`
    );
  }

  if (
    hasBlockingReasons !==
    (blockingReasons.length > 0)
  ) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.hasBlockingReasons to match whether blockingReasons is non-empty.`
    );
  }

  if (handoffSupported !== canConsumeHandoff) {
    throw new ValidationError(
      `Attempt handoff report-ready requires ${fieldName}.handoffSupported to match ${fieldName}.canConsumeHandoff.`
    );
  }

  return {
    blockingReasons: [...blockingReasons],
    canConsumeHandoff: canConsumeHandoff as boolean,
    hasBlockingReasons: hasBlockingReasons as boolean,
    handoffSupported: handoffSupported as boolean
  };
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

function readSelectionObject(
  container: Record<string, unknown>,
  key: string,
  message: string
): Record<string, unknown> {
  const value = readSelectionValue(container, key, message);

  if (!isRecord(value)) {
    throw new ValidationError(message);
  }

  return value;
}

function hasOwnIndex(array: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(array, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
