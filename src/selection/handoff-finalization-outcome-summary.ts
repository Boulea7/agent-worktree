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
  normalizeSelectionArrayProperty,
  normalizeSelectionObjectArrayEntry,
  normalizeSelectionObjectProperty,
  readSelectionValue,
  validateSelectionObjectInput
} from "./entry-validation.js";
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

  validateSelectionObjectInput(
    batch,
    "Attempt handoff finalization outcome summary requires batch.results to be an array."
  );

  const results = validateApplyResultArray(
    normalizeSelectionArrayProperty(
      batch,
      "results",
      "Attempt handoff finalization outcome summary requires batch.results to be an array."
    ),
    "batch.results"
  );
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
  results: readonly unknown[],
  fieldName: string
): AttemptHandoffFinalizationApply[] {
  const validatedResults: AttemptHandoffFinalizationApply[] = [];

  for (let index = 0; index < results.length; index += 1) {
    const entry = normalizeSelectionObjectArrayEntry<Record<string, unknown>>(
      results,
      index,
      `Attempt handoff finalization outcome summary requires ${fieldName}[${index}] to expose consumer and consume objects.`
    );

    validatedResults.push(
      normalizeApplyResult(
        entry,
        `Attempt handoff finalization outcome summary requires ${fieldName}[${index}] to expose consumer and consume objects.`
      )
    );
  }

  return validatedResults;
}

function normalizeApplyResult(
  entry: Record<string, unknown>,
  message: string
): AttemptHandoffFinalizationApply {
  return {
    consumer: normalizeSelectionObjectProperty(entry, "consumer", message),
    consume: normalizeSelectionObjectProperty(entry, "consume", message)
  } as unknown as AttemptHandoffFinalizationApply;
}

function deriveOutcome(
  entry: AttemptHandoffFinalizationApply
): AttemptHandoffFinalizationOutcome {
  const consumer = normalizeSelectionObjectProperty(
    entry,
    "consumer",
    "Attempt handoff finalization outcome summary requires each batch result to expose consumer and consume objects."
  );
  const consume = normalizeSelectionObjectProperty(
    entry,
    "consume",
    "Attempt handoff finalization outcome summary requires each batch result to expose consumer and consume objects."
  );

  const consumerRequest = normalizeRequest(
    normalizeSelectionObjectProperty(
      consumer,
      "request",
      "Attempt handoff finalization outcome summary requires entry.consumer.request to be an object."
    ),
    "entry.consumer.request"
  );
  const consumeRequest = normalizeRequest(
    normalizeSelectionObjectProperty(
      consume,
      "request",
      "Attempt handoff finalization outcome summary requires entry.consume.request to be an object."
    ),
    "entry.consume.request"
  );

  validateMatchingRequest(
    consumerRequest,
    consumeRequest,
    "entry.consume.request"
  );

  const consumerReadiness = normalizeReadiness(
    normalizeSelectionObjectProperty(
      consumer,
      "readiness",
      "Attempt handoff finalization outcome summary requires entry.consumer.readiness to be an object."
    ),
    "entry.consumer.readiness"
  );
  const consumeReadiness = normalizeReadiness(
    normalizeSelectionObjectProperty(
      consume,
      "readiness",
      "Attempt handoff finalization outcome summary requires entry.consume.readiness to be an object."
    ),
    "entry.consume.readiness"
  );

  validateMatchingReadiness(consumerReadiness, consumeReadiness);

  const invoked = readSelectionValue(
    consume,
    "invoked",
    "Attempt handoff finalization outcome summary requires entry.consume.invoked to be a boolean."
  );

  if (typeof invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires entry.consume.invoked to be a boolean."
    );
  }

  const blockingReasons = [...consumerReadiness.blockingReasons];

  if (invoked && blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires invoked entries to use empty blockingReasons."
    );
  }

  if (!invoked && blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization outcome summary requires blocked entries to keep blockingReasons."
    );
  }

  return {
    taskId: consumerRequest.taskId,
    attemptId: consumerRequest.attemptId,
    runtime: consumerRequest.runtime,
    status: consumerRequest.status,
    sourceKind: consumerRequest.sourceKind,
    invoked,
    blockingReasons
  };
}

function normalizeRequest(
  request: Record<string, unknown>,
  fieldName: string
): AttemptHandoffFinalizationRequest {
  const taskId = readSelectionValue(
    request,
    "taskId",
    `Attempt handoff finalization outcome summary requires ${fieldName}.taskId to be a non-empty string.`
  );
  const attemptId = readSelectionValue(
    request,
    "attemptId",
    `Attempt handoff finalization outcome summary requires ${fieldName}.attemptId to be a non-empty string.`
  );
  const runtime = readSelectionValue(
    request,
    "runtime",
    `Attempt handoff finalization outcome summary requires ${fieldName}.runtime to be a non-empty string.`
  );
  const status = readSelectionValue(
    request,
    "status",
    `Attempt handoff finalization outcome summary requires ${fieldName}.status to use the existing attempt status vocabulary.`
  );
  const sourceKind = readSelectionValue(
    request,
    "sourceKind",
    `Attempt handoff finalization outcome summary requires ${fieldName}.sourceKind to use the existing attempt source-kind vocabulary when provided.`
  );

  validateRequiredString(taskId, `${fieldName}.taskId`);
  validateRequiredString(attemptId, `${fieldName}.attemptId`);
  validateRequiredString(runtime, `${fieldName}.runtime`);
  validateAttemptStatus(status, `${fieldName}.status`);
  validateAttemptSourceKind(sourceKind, `${fieldName}.sourceKind`);

  return {
    taskId: (taskId as string).trim(),
    attemptId: (attemptId as string).trim(),
    runtime: (runtime as string).trim(),
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined
  };
}

function validateMatchingRequest(
  consumerRequest: AttemptHandoffFinalizationRequest,
  consumeRequest: AttemptHandoffFinalizationRequest,
  fieldName: string
): void {
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

function normalizeReadiness(
  readiness: Record<string, unknown>,
  fieldName: string
): AttemptHandoffFinalizationConsumerReadiness {
  const blockingReasons = normalizeBlockingReasons(
    normalizeSelectionArrayProperty(
      readiness,
      "blockingReasons",
      `Attempt handoff finalization outcome summary requires ${fieldName}.blockingReasons to be an array.`
    ),
    `${fieldName}.blockingReasons`
  );
  const canConsumeHandoffFinalization = readSelectionValue(
    readiness,
    "canConsumeHandoffFinalization",
    `Attempt handoff finalization outcome summary requires ${fieldName}.canConsumeHandoffFinalization to be a boolean.`
  );
  const hasBlockingReasons = readSelectionValue(
    readiness,
    "hasBlockingReasons",
    `Attempt handoff finalization outcome summary requires ${fieldName}.hasBlockingReasons to be a boolean.`
  );
  const handoffFinalizationSupported = readSelectionValue(
    readiness,
    "handoffFinalizationSupported",
    `Attempt handoff finalization outcome summary requires ${fieldName}.handoffFinalizationSupported to be a boolean.`
  );

  if (typeof canConsumeHandoffFinalization !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.canConsumeHandoffFinalization to be a boolean.`
    );
  }

  if (typeof hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.hasBlockingReasons to be a boolean.`
    );
  }

  if (typeof handoffFinalizationSupported !== "boolean") {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.handoffFinalizationSupported to be a boolean.`
    );
  }

  const derivedHasBlockingReasons = blockingReasons.length > 0;

  if (canConsumeHandoffFinalization !== !derivedHasBlockingReasons) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.canConsumeHandoffFinalization to match whether blockingReasons is empty.`
    );
  }

  if (hasBlockingReasons !== derivedHasBlockingReasons) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.hasBlockingReasons to match whether blockingReasons is non-empty.`
    );
  }

  if (handoffFinalizationSupported !== canConsumeHandoffFinalization) {
    throw new ValidationError(
      `Attempt handoff finalization outcome summary requires ${fieldName}.handoffFinalizationSupported to match ${fieldName}.canConsumeHandoffFinalization.`
    );
  }

  return {
    blockingReasons,
    canConsumeHandoffFinalization,
    hasBlockingReasons,
    handoffFinalizationSupported
  };
}

function validateMatchingReadiness(
  consumerReadiness: AttemptHandoffFinalizationConsumerReadiness,
  consumeReadiness: AttemptHandoffFinalizationConsumerReadiness
): void {
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

function normalizeBlockingReasons(
  blockingReasons: readonly unknown[],
  fieldName: string
): AttemptHandoffFinalizationConsumerBlockingReason[] {
  const normalizedBlockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[] = [];

  for (let index = 0; index < blockingReasons.length; index += 1) {
    const value = blockingReasons[index];

    if (
      !Object.prototype.hasOwnProperty.call(blockingReasons, index) ||
      typeof value !== "string" ||
      !validBlockingReasons.has(
        value as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `Attempt handoff finalization outcome summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }

    normalizedBlockingReasons.push(
      value as AttemptHandoffFinalizationConsumerBlockingReason
    );
  }

  return normalizedBlockingReasons;
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
