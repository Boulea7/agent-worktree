import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffCapabilityResolver,
  AttemptHandoffConsumer,
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffRequest
} from "./types.js";
import {
  validateSelectionObjectInput,
  validateSelectionOptionalFunction
} from "./entry-validation.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffConsumer(input: {
  request: AttemptHandoffRequest | undefined;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}): AttemptHandoffConsumer | undefined {
  validateSelectionObjectInput(
    input,
    "Attempt handoff consumer input must be an object."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt handoff consumer requires resolveHandoffCapability to be a function when provided."
  );
  const { request } = input;

  if (request === undefined) {
    return undefined;
  }

  validateSelectionObjectInput(
    request,
    "Attempt handoff consumer requires request to be an object when provided."
  );

  const taskId = normalizeRequiredString(request.taskId, "request.taskId");
  const attemptId = normalizeRequiredString(request.attemptId, "request.attemptId");
  const runtime = normalizeRequiredString(request.runtime, "request.runtime");
  validateAttemptStatus(request.status);
  validateAttemptSourceKind(request.sourceKind);

  const handoffSupported = normalizeHandoffCapability(
    input.resolveHandoffCapability === undefined
      ? false
      : input.resolveHandoffCapability(runtime)
  );
  const blockingReasons: AttemptHandoffConsumerBlockingReason[] =
    handoffSupported ? [] : ["handoff_unsupported"];

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
      canConsumeHandoff: blockingReasons.length === 0,
      hasBlockingReasons: blockingReasons.length > 0,
      handoffSupported
    }
  };
}

function normalizeHandoffCapability(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consumer requires resolveHandoffCapability to return a boolean."
    );
  }

  return value;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff consumer requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff consumer requires ${fieldName} to be a non-empty string.`
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
      "Attempt handoff consumer requires request.status to use the existing attempt status vocabulary."
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
      "Attempt handoff consumer requires request.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}
