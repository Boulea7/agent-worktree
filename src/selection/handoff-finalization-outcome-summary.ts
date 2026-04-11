import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffFinalizationApply,
  AttemptHandoffFinalizationApplyBatch,
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationConsumerReadiness,
  AttemptHandoffFinalizationOutcome,
  AttemptHandoffFinalizationOutcomeSummary,
  AttemptHandoffFinalizationRequest
} from "./types.js";
import {
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "./downstream-identity-guardrails.js";

const attemptHandoffFinalizationOutcomeBasis =
  "handoff_finalization_apply_batch" as const;

const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffFinalizationOutcomeSummary(
  batch: AttemptHandoffFinalizationApplyBatch | undefined
): AttemptHandoffFinalizationOutcomeSummary | undefined {
  if (batch === undefined) {
    return undefined;
  }

  if (!isRecord(batch) || !Array.isArray(batch.results)) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires batch.results to be an array."
    );
  }

  const results = validateApplyResultArray(batch.results, "batch.results");
  const outcomes = results.map(deriveOutcome);
  validateDownstreamSingleTaskBoundary(
    outcomes,
    "Attempt handoff finalization outcome summary requires batch.results from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    outcomes,
    "Attempt handoff finalization outcome summary requires batch.results to use unique (taskId, attemptId, runtime) identities."
  );
  const blockingReasons = collectBlockingReasons(outcomes);
  const invokedResultCount = outcomes.filter((outcome) => outcome.invoked).length;
  const blockedResultCount = outcomes.length - invokedResultCount;

  return {
    outcomeBasis: attemptHandoffFinalizationOutcomeBasis,
    resultCount: outcomes.length,
    invokedResultCount,
    blockedResultCount,
    blockingReasons,
    outcomes
  };
}

function validateApplyResultArray(
  results: readonly AttemptHandoffFinalizationApply[],
  fieldName: string
): AttemptHandoffFinalizationApply[] {
  const validatedResults: AttemptHandoffFinalizationApply[] = [];

  for (let index = 0; index < results.length; index += 1) {
    if (!hasOwnIndex(results, index)) {
      throw new ValidationError(
        `Attempt handoff finalization outcome summary requires ${fieldName}[${index}] to expose consumer and consume objects.`
      );
    }

    validatedResults.push(results[index]!);
  }

  return validatedResults;
}

function deriveOutcome(
  entry: AttemptHandoffFinalizationApply
): AttemptHandoffFinalizationOutcome {
  if (!isRecord(entry) || !isRecord(entry.consumer) || !isRecord(entry.consume)) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires each batch result to expose consumer and consume objects."
    );
  }

  validateMatchingRequest(
    entry.consumer.request,
    entry.consume.request,
    "entry.consume.request"
  );
  validateMatchingReadiness(entry.consumer.readiness, entry.consume.readiness);

  if (typeof entry.consume.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires entry.consume.invoked to be a boolean."
    );
  }

  const blockingReasons = [...entry.consumer.readiness.blockingReasons];

  if (entry.consume.invoked && blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires invoked entries to use empty blockingReasons."
    );
  }

  if (!entry.consume.invoked && blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires blocked entries to keep blockingReasons."
    );
  }

  return {
    taskId: entry.consumer.request.taskId,
    attemptId: entry.consumer.request.attemptId,
    runtime: entry.consumer.request.runtime,
    status: entry.consumer.request.status,
    sourceKind: entry.consumer.request.sourceKind,
    invoked: entry.consume.invoked,
    blockingReasons
  };
}

function validateMatchingRequest(
  consumerRequest: AttemptHandoffFinalizationRequest,
  consumeRequest: AttemptHandoffFinalizationRequest,
  fieldName: string
): void {
  validateRequest(consumerRequest, "entry.consumer.request");
  validateRequest(consumeRequest, fieldName);

  if (
    consumerRequest.taskId !== consumeRequest.taskId ||
    consumerRequest.attemptId !== consumeRequest.attemptId ||
    consumerRequest.runtime !== consumeRequest.runtime ||
    consumerRequest.status !== consumeRequest.status ||
    consumerRequest.sourceKind !== consumeRequest.sourceKind
  ) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName} to match entry.consumer.request.`
    );
  }
}

function validateMatchingReadiness(
  consumerReadiness: AttemptHandoffFinalizationConsumerReadiness,
  consumeReadiness: AttemptHandoffFinalizationConsumerReadiness
): void {
  validateReadiness(consumerReadiness, "entry.consumer.readiness");
  validateReadiness(consumeReadiness, "entry.consume.readiness");

  if (
    consumerReadiness.canConsumeHandoffFinalization !==
      consumeReadiness.canConsumeHandoffFinalization ||
    consumerReadiness.hasBlockingReasons !==
      consumeReadiness.hasBlockingReasons ||
    consumerReadiness.handoffFinalizationSupported !==
      consumeReadiness.handoffFinalizationSupported ||
    !stringArraysEqual(
      consumerReadiness.blockingReasons,
      consumeReadiness.blockingReasons
    )
  ) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires entry.consume.readiness to match entry.consumer.readiness."
    );
  }
}

function validateReadiness(
  readiness: AttemptHandoffFinalizationConsumerReadiness,
  fieldName: string
): void {
  if (!isRecord(readiness)) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName} to be an object.`
    );
  }

  if (!Array.isArray(readiness.blockingReasons)) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.blockingReasons to be an array.`
    );
  }
  validateBlockingReasons(
    readiness.blockingReasons,
    `${fieldName}.blockingReasons`
  );

  if (typeof readiness.canConsumeHandoffFinalization !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.canConsumeHandoffFinalization to be a boolean.`
    );
  }

  if (typeof readiness.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.hasBlockingReasons to be a boolean.`
    );
  }

  if (typeof readiness.handoffFinalizationSupported !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.handoffFinalizationSupported to be a boolean.`
    );
  }

  const hasBlockingReasons = readiness.blockingReasons.length > 0;

  if (readiness.canConsumeHandoffFinalization !== !hasBlockingReasons) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.canConsumeHandoffFinalization to match whether blockingReasons is empty.`
    );
  }

  if (readiness.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.hasBlockingReasons to match whether blockingReasons is non-empty.`
    );
  }

  if (
    readiness.handoffFinalizationSupported !==
    readiness.canConsumeHandoffFinalization
  ) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.handoffFinalizationSupported to match ${fieldName}.canConsumeHandoffFinalization.`
    );
  }
}

function validateBlockingReasons(
  blockingReasons: readonly unknown[],
  fieldName: string
): void {
  for (let index = 0; index < blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(blockingReasons, index) ||
      typeof blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        blockingReasons[
          index
        ] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `Attempt handoff finalization outcome summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }
  }
}

function collectBlockingReasons(
  outcomes: readonly AttemptHandoffFinalizationOutcome[]
): AttemptHandoffFinalizationConsumerBlockingReason[] {
  const reasons = new Set<AttemptHandoffFinalizationConsumerBlockingReason>();

  for (const outcome of outcomes) {
    for (const reason of outcome.blockingReasons) {
      reasons.add(reason);
    }
  }

  return [...reasons];
}

function stringArraysEqual(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequest(
  request: AttemptHandoffFinalizationRequest,
  fieldName: string
): void {
  if (!isRecord(request)) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName} to be an object.`
    );
  }

  validateRequiredString(request.taskId, `${fieldName}.taskId`);
  validateRequiredString(request.attemptId, `${fieldName}.attemptId`);
  validateRequiredString(request.runtime, `${fieldName}.runtime`);
  validateAttemptStatus(request.status, `${fieldName}.status`);
  validateAttemptSourceKind(request.sourceKind, `${fieldName}.sourceKind`);
}

function validateRequiredString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff finalization outcome summary requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}
