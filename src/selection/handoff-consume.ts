import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffConsume,
  AttemptHandoffConsumerBlockingReason,
  AttemptHandoffConsumerReadiness,
  AttemptHandoffConsumeInput
} from "./types.js";
import {
  readOwnedSelectionValue,
  rethrowSelectionAccessError
} from "./entry-validation.js";

const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validBlockingReasons = new Set<AttemptHandoffConsumerBlockingReason>([
  "handoff_unsupported"
]);

export async function consumeAttemptHandoff(
  input: AttemptHandoffConsumeInput
): Promise<AttemptHandoffConsume> {
  let request: AttemptHandoffConsume["request"];
  let readiness: AttemptHandoffConsume["readiness"];
  let invokeHandoff: AttemptHandoffConsumeInput["invokeHandoff"];

  try {
    validateInput(input);
    invokeHandoff = readOwnedSelectionValue(
      input,
      "invokeHandoff",
      "Attempt handoff consume input must be a readable object."
    ) as AttemptHandoffConsumeInput["invokeHandoff"];
    validateInvokeHandoff(invokeHandoff);
    const consumer = normalizeConsumer(
      readOwnedSelectionValue(
        input,
        "consumer",
        "Attempt handoff consume input must be a readable object."
      )
    );
    request = consumer.request;
    readiness = consumer.readiness;
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt handoff consume input must be a readable object."
    );
  }

  if (!readiness.canConsumeHandoff) {
    return {
      request,
      readiness,
      invoked: false
    };
  }

  await invokeHandoff(request);

  return {
    request,
    readiness,
    invoked: true
  };
}

function validateInput(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError("Attempt handoff consume input must be an object.");
  }
}

function validateInvokeHandoff(value: unknown): void {
  if (typeof value !== "function") {
    throw new ValidationError(
      "Attempt handoff consume requires invokeHandoff to be a function."
    );
  }
}

function validateConsumer(value: unknown): void {
  if (!isRecord(value)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer to be an object."
    );
  }

  if (!isRecord(value.request)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.request to be an object."
    );
  }

  if (!isRecord(value.readiness)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness to be an object."
    );
  }
}

function normalizeConsumer(value: unknown): {
  request: AttemptHandoffConsume["request"];
  readiness: AttemptHandoffConsume["readiness"];
} {
  validateConsumer(value);
  const consumer = value as Record<string, unknown>;

  const request = readOwnedSelectionValue(
    consumer,
    "request",
    "Attempt handoff consume input must be a readable object."
  );
  const readiness = readOwnedSelectionValue(
    consumer,
    "readiness",
    "Attempt handoff consume input must be a readable object."
  );

  if (!isRecord(request)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.request to be an object."
    );
  }

  if (!isRecord(readiness)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness to be an object."
    );
  }

  const normalizedReadiness = normalizeReadiness(readiness);

  const normalizedRequest = normalizeRequest(request);
  validateReadiness(normalizedReadiness);

  return {
    request: normalizedRequest,
    readiness: normalizedReadiness
  };
}

function normalizeRequest(
  value: Record<string, unknown>
): AttemptHandoffConsume["request"] {
  const taskId = readOwnedSelectionValue(
    value,
    "taskId",
    "Attempt handoff consume input must be a readable object."
  );
  const attemptId = readOwnedSelectionValue(
    value,
    "attemptId",
    "Attempt handoff consume input must be a readable object."
  );
  const runtime = readOwnedSelectionValue(
    value,
    "runtime",
    "Attempt handoff consume input must be a readable object."
  );
  const status = readOwnedSelectionValue(
    value,
    "status",
    "Attempt handoff consume input must be a readable object."
  );
  const sourceKind = readOwnedSelectionValue(
    value,
    "sourceKind",
    "Attempt handoff consume input must be a readable object."
  );

  validateRequest({
    taskId,
    attemptId,
    runtime,
    status,
    sourceKind
  });

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
): AttemptHandoffConsumerReadiness {
  return {
    blockingReasons: readOwnedSelectionValue(
      value,
      "blockingReasons",
      "Attempt handoff consume input must be a readable object."
    ) as AttemptHandoffConsumerReadiness["blockingReasons"],
    canConsumeHandoff: readOwnedSelectionValue(
      value,
      "canConsumeHandoff",
      "Attempt handoff consume input must be a readable object."
    ) as AttemptHandoffConsumerReadiness["canConsumeHandoff"],
    hasBlockingReasons: readOwnedSelectionValue(
      value,
      "hasBlockingReasons",
      "Attempt handoff consume input must be a readable object."
    ) as AttemptHandoffConsumerReadiness["hasBlockingReasons"],
    handoffSupported: readOwnedSelectionValue(
      value,
      "handoffSupported",
      "Attempt handoff consume input must be a readable object."
    ) as AttemptHandoffConsumerReadiness["handoffSupported"]
  };
}

function validateRequest(value: {
  taskId?: unknown;
  attemptId?: unknown;
  runtime?: unknown;
  status?: unknown;
  sourceKind?: unknown;
}): void {
  validateRequiredString(value.taskId, "consumer.request.taskId");
  validateRequiredString(value.attemptId, "consumer.request.attemptId");
  validateRequiredString(value.runtime, "consumer.request.runtime");
  validateAttemptStatus(value.status, "consumer.request.status");
  validateAttemptSourceKind(value.sourceKind, "consumer.request.sourceKind");
}

function validateReadiness(value: AttemptHandoffConsumerReadiness): void {
  if (!Array.isArray(value.blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.blockingReasons to be an array."
    );
  }

  for (let index = 0; index < value.blockingReasons.length; index += 1) {
    if (
      !hasOwnIndex(value.blockingReasons, index) ||
      typeof value.blockingReasons[index] !== "string" ||
      !validBlockingReasons.has(
        value.blockingReasons[index] as AttemptHandoffConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        "Attempt handoff consume requires consumer.readiness.blockingReasons to use the existing handoff consumer blocker vocabulary."
      );
    }
  }

  if (typeof value.canConsumeHandoff !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.canConsumeHandoff to be a boolean."
    );
  }

  if (typeof value.hasBlockingReasons !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.hasBlockingReasons to be a boolean."
    );
  }

  if (typeof value.handoffSupported !== "boolean") {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.handoffSupported to be a boolean."
    );
  }

  const hasBlockingReasons = value.blockingReasons.length > 0;

  if (value.canConsumeHandoff !== !hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.canConsumeHandoff to match whether blockingReasons is empty."
    );
  }

  if (value.hasBlockingReasons !== hasBlockingReasons) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.hasBlockingReasons to match whether blockingReasons is non-empty."
    );
  }

  if (value.handoffSupported !== value.canConsumeHandoff) {
    throw new ValidationError(
      "Attempt handoff consume requires consumer.readiness.handoffSupported to match consumer.readiness.canConsumeHandoff."
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
      `Attempt handoff consume requires ${fieldName} to be a non-empty string.`
    );
  }
}

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff consume requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff consume requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}
