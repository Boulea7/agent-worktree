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

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffConsumer(input: {
  request: AttemptHandoffRequest | undefined;
  resolveHandoffCapability?: AttemptHandoffCapabilityResolver;
}): AttemptHandoffConsumer | undefined {
  const { request } = input;

  if (request === undefined) {
    return undefined;
  }

  validateTaskId(request.taskId);
  validateNonEmptyString(request.attemptId, "request.attemptId");
  validateNonEmptyString(request.runtime, "request.runtime");
  validateAttemptStatus(request.status);
  validateAttemptSourceKind(request.sourceKind);

  const handoffSupported =
    input.resolveHandoffCapability?.(request.runtime) ?? false;
  const blockingReasons: AttemptHandoffConsumerBlockingReason[] =
    handoffSupported ? [] : ["handoff_unsupported"];

  return {
    request: {
      taskId: request.taskId,
      attemptId: request.attemptId,
      runtime: request.runtime,
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

function validateTaskId(value: unknown): void {
  if (value !== undefined && typeof value !== "string") {
    throw new ValidationError(
      "Attempt handoff consumer requires request.taskId to be a string when provided."
    );
  }
}

function validateNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff consumer requires ${fieldName} to be a non-empty string.`
    );
  }
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
