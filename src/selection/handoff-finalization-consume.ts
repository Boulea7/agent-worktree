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
import {
  accessSelectionValue,
  rethrowSelectionAccessError
} from "./entry-validation.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);

export async function consumeAttemptHandoffFinalization(
  input: AttemptHandoffFinalizationConsumeInput
): Promise<AttemptHandoffFinalizationConsume> {
  let invokeHandoffFinalization:
    | AttemptHandoffFinalizationConsumeInput["invokeHandoffFinalization"]
    | undefined;
  let request: AttemptHandoffFinalizationRequest;
  let readiness: AttemptHandoffFinalizationConsumerReadiness;

  try {
    validateInput(input);
    const invoke = accessSelectionValue(input, "invokeHandoffFinalization");
    validateInvokeHandoffFinalization(invoke);
    invokeHandoffFinalization =
      invoke as AttemptHandoffFinalizationConsumeInput["invokeHandoffFinalization"];
    const consumer = normalizeConsumer(
      accessSelectionValue(input, "consumer")
    );
    request = consumer.request;
    readiness = consumer.readiness;
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff finalization consume input must be a readable object."
    );
  }

  if (!readiness.canConsumeHandoffFinalization) {
    return {
      request,
      readiness,
      invoked: false
    };
  }

  await invokeHandoffFinalization(request);

  return {
    request,
    readiness,
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

function normalizeConsumer(value: unknown): {
  request: AttemptHandoffFinalizationRequest;
  readiness: AttemptHandoffFinalizationConsumerReadiness;
} {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer to be an object."
    );
  }

  const request = accessSelectionValue(value, "request");

  if (!isRecord(request)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.request to be an object."
    );
  }

  const readiness = accessSelectionValue(value, "readiness");

  if (!isRecord(readiness)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness to be an object."
    );
  }

  return {
    request: normalizeRequest(request),
    readiness: normalizeReadiness(readiness)
  };
}

function normalizeRequest(
  value: Record<string, unknown>
): AttemptHandoffFinalizationRequest {
  const taskId = accessSelectionValue(value, "taskId");
  const attemptId = accessSelectionValue(value, "attemptId");
  const runtime = accessSelectionValue(value, "runtime");
  const status = accessSelectionValue(value, "status");
  const sourceKind = accessSelectionValue(value, "sourceKind");

  validateRequiredString(taskId, "consumer.request.taskId");
  validateRequiredString(attemptId, "consumer.request.attemptId");
  validateRequiredString(runtime, "consumer.request.runtime");
  validateAttemptStatus(status, "consumer.request.status");
  validateAttemptSourceKind(sourceKind, "consumer.request.sourceKind");

  return {
    taskId: taskId as string,
    attemptId: attemptId as string,
    runtime: runtime as string,
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined
  };
}

function normalizeReadiness(
  value: Record<string, unknown>
): AttemptHandoffFinalizationConsumerReadiness {
  const blockingReasons = accessSelectionValue(value, "blockingReasons");

  if (!Array.isArray(blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  const normalizedBlockingReasons: AttemptHandoffFinalizationConsumerBlockingReason[] = [];

  for (let index = 0; index < blockingReasons.length; index += 1) {
    const blockingReason = readArrayEntry(
      blockingReasons,
      index,
      "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to contain only known blocking reasons."
    );

    if (
      !hasOwnIndex(blockingReasons, index) ||
      typeof blockingReason !== "string" ||
      !validBlockingReasons.has(
        blockingReason as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff finalization consume requires consumer.readiness.blockingReasons to contain only known blocking reasons."
      );
    }

    normalizedBlockingReasons.push(
      blockingReason as AttemptHandoffFinalizationConsumerBlockingReason
    );
  }

  const canConsumeHandoffFinalization = accessSelectionValue(
    value,
    "canConsumeHandoffFinalization"
  );
  if (typeof canConsumeHandoffFinalization !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to be a boolean."
    );
  }

  const hasBlockingReasons = accessSelectionValue(value, "hasBlockingReasons");
  if (typeof hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  const handoffFinalizationSupported = accessSelectionValue(
    value,
    "handoffFinalizationSupported"
  );
  if (typeof handoffFinalizationSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to be a boolean."
    );
  }

  const derivedHasBlockingReasons = normalizedBlockingReasons.length > 0;

  if (canConsumeHandoffFinalization !== !derivedHasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.canConsumeHandoffFinalization to match whether blockingReasons is empty."
    );
  }

  if (hasBlockingReasons !== derivedHasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (
    handoffFinalizationSupported !==
    canConsumeHandoffFinalization
  ) {
    throw new ValidationError(
      "Attempt handoff finalization consume requires consumer.readiness.handoffFinalizationSupported to match consumer.readiness.canConsumeHandoffFinalization."
    );
  }

  return {
    blockingReasons: normalizedBlockingReasons,
    canConsumeHandoffFinalization,
    hasBlockingReasons,
    handoffFinalizationSupported
  };
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function readArrayEntry(
  values: readonly unknown[],
  index: number,
  message: string
): unknown {
  try {
    return values[index];
  } catch {
    throw new ValidationError(message);
  }
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
