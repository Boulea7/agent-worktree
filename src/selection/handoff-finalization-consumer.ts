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
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction
} from "./entry-validation.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffFinalizationConsumer(input: {
  request: AttemptHandoffFinalizationRequest | undefined;
  resolveHandoffFinalizationCapability?: AttemptHandoffFinalizationCapabilityResolver;
}): AttemptHandoffFinalizationConsumer | undefined {
  validateSelectionObjectInput(
    input,
    "Attempt handoff finalization consumer input must be an object."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffFinalizationCapability,
    "Attempt handoff finalization consumer requires resolveHandoffFinalizationCapability to be a function when provided."
  );
  const { request } = input;

  if (request === undefined) {
    return undefined;
  }

  const taskId = normalizeRequiredString(request.taskId, "request.taskId");
  const attemptId = normalizeRequiredString(request.attemptId, "request.attemptId");
  const runtime = normalizeRequiredString(request.runtime, "request.runtime");
  validateAttemptStatus(request.status);
  validateAttemptSourceKind(request.sourceKind);

  const handoffFinalizationSupported = normalizeHandoffFinalizationCapability(
    input.resolveHandoffFinalizationCapability === undefined
      ? false
      : input.resolveHandoffFinalizationCapability(runtime)
  );
  const blockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[] =
    handoffFinalizationSupported ? [] : ["handoff_finalization_unsupported"];

  return {
    request: {
      taskId,
      attemptId,
      runtime,
      status: request.status,
      sourceKind: request.sourceKind
    },
    readiness: {
      blockingReasons,
      canConsumeHandoffFinalization: blockingReasons.length === 0,
      hasBlockingReasons: blockingReasons.length > 0,
      handoffFinalizationSupported
    }
  };
}

function normalizeHandoffFinalizationCapability(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consumer requires resolveHandoffFinalizationCapability to return a boolean."
    );
  }

  return value;
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
