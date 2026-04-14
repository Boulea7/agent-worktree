import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffFinalizationCapabilityResolver,
  AttemptHandoffFinalizationConsumer,
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationRequest
} from "./types.js";
import { normalizeHandoffFinalizationCapability } from "./handoff-finalization-capability-shared.js";
import {
  accessSelectionValue,
  readOwnedSelectionValue,
  rethrowSelectionAccessError,
  validateSelectionObjectInput,
  validateSelectionOptionalFunction
} from "./entry-validation.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffFinalizationConsumer(input: {
  request: AttemptHandoffFinalizationRequest | undefined;
  resolveHandoffFinalizationCapability?: AttemptHandoffFinalizationCapabilityResolver;
}): AttemptHandoffFinalizationConsumer | undefined {
  let resolveHandoffFinalizationCapability:
    | AttemptHandoffFinalizationCapabilityResolver
    | undefined;
  let taskId: string;
  let attemptId: string;
  let runtime: string;
  let status: AttemptStatus;
  let sourceKind: AttemptSourceKind | undefined;

  try {
    validateSelectionObjectInput(
      input,
      "Attempt handoff finalization consumer input must be an object."
    );
    resolveHandoffFinalizationCapability = readOwnedSelectionValue(
      input,
      "resolveHandoffFinalizationCapability",
      "Attempt handoff finalization consumer input must be a readable object."
    ) as AttemptHandoffFinalizationCapabilityResolver | undefined;
    validateSelectionOptionalFunction(
      resolveHandoffFinalizationCapability,
      "Attempt handoff finalization consumer requires resolveHandoffFinalizationCapability to be a function when provided."
    );
    const request = readOwnedSelectionValue(
      input,
      "request",
      "Attempt handoff finalization consumer input must be a readable object."
    );

    if (request === undefined) {
      return undefined;
    }

    validateSelectionObjectInput(
      request,
      "Attempt handoff finalization consumer requires request to be an object when provided."
    );

    taskId = normalizeRequiredString(
      accessSelectionValue(request, "taskId"),
      "request.taskId"
    );
    attemptId = normalizeRequiredString(
      accessSelectionValue(request, "attemptId"),
      "request.attemptId"
    );
    runtime = normalizeRequiredString(
      accessSelectionValue(request, "runtime"),
      "request.runtime"
    );
    const statusValue = accessSelectionValue(request, "status");
    const sourceKindValue = accessSelectionValue(request, "sourceKind");
    validateAttemptStatus(statusValue);
    validateAttemptSourceKind(sourceKindValue);
    status = statusValue as AttemptStatus;
    sourceKind = sourceKindValue as AttemptSourceKind | undefined;
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization consumer input must be a readable object."
    );
  }

  const handoffFinalizationSupported = normalizeHandoffFinalizationCapability(
    resolveHandoffFinalizationCapability === undefined
      ? false
      : resolveHandoffFinalizationCapability(runtime),
    "Attempt handoff finalization consumer"
  );
  const blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[] =
    handoffFinalizationSupported ? [] : ["handoff_finalization_unsupported"];

  return {
    request: {
      taskId,
      attemptId,
      runtime,
      status,
      sourceKind
    },
    readiness: {
      blockingReasons,
      canConsumeHandoffFinalization: blockingReasons.length === 0,
      hasBlockingReasons: blockingReasons.length > 0,
      handoffFinalizationSupported
    }
  };
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization consumer requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization consumer requires ${fieldName} to be a non-empty string.`
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
      "Attempt handoff finalization consumer requires request.status to use the existing attempt status vocabulary."
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
      "Attempt handoff finalization consumer requires request.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}
