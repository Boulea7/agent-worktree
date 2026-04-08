import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeInput,
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationRequest,
  AttemptHandoffFinalizationConsumerReadiness
} from "./types.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);

export async function consumeAttemptHandoffFinalization(
  input: AttemptHandoffFinalizationConsumeInput
): Promise<AttemptHandoffFinalizationConsume> {
  validateInput(input);
  validateInvokeHandoffFinalization(input.invokeHandoffFinalization);
  const { consumer, invokeHandoffFinalization } = input;
  validateConsumer(consumer);
  validateRequest(consumer.request);
  validateReadiness(consumer.readiness);
  const request = consumer.request;

  if (!consumer.readiness.canConsumeHandoffFinalization) {
    return {
      request,
      readiness: consumer.readiness,
      invoked: false
    };
  }

  await invokeHandoffFinalization(request);

  return {
    request,
    readiness: consumer.readiness,
    invoked: true
  };
}

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume input must be an object."
    );
  }
}

function validateInvokeHandoffFinalization(value: unknown): void {
  if (typeof value !== "function") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires invokeHandoffFinalization to be a function."
    );
  }
}

function validateConsumer(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer to be an object."
    );
  }

  if (!isRecord(value.request)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.request to be an object."
    );
  }

  if (!isRecord(value.readiness)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness to be an object."
    );
  }
}

function validateRequest(value: AttemptHandoffFinalizationRequest): void {
  validateRequiredString(value.taskId, "consumer.request.taskId");
  validateRequiredString(value.attemptId, "consumer.request.attemptId");
  validateRequiredString(value.runtime, "consumer.request.runtime");
  validateAttemptStatus(value.status, "consumer.request.status");
  validateAttemptSourceKind(value.sourceKind, "consumer.request.sourceKind");
}

function validateReadiness(
  value: AttemptHandoffFinalizationConsumerReadiness
): void {
  if (!Array.isArray(value.blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < value.blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(value.blockingReasons, index) ||
      typeof value.blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        value.blockingReasons[index] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to contain only known blocking reasons."
      );
    }
  }

  if (typeof value.canConsumeHandoffFinalization !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to be a boolean."
    );
  }

  if (typeof value.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof value.handoffFinalizationSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to be a boolean."
    );
  }

  const hasBlockingReasons = value.blockingReasons.length > 0;

  if (value.canConsumeHandoffFinalization !== !hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to match whether blockingReasons is empty."
    );
  }

  if (value.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (
    value.handoffFinalizationSupported !==
    value.canConsumeHandoffFinalization
  ) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to match consumer.readiness.canConsumeHandoffFinalization."
    );
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequiredString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization consume requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization consume requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff finalization consume requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}
