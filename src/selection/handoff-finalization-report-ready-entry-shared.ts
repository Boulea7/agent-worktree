import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationReportReadyEntry
} from "./types.js";

const validExplanationCodes = new Set<AttemptHandoffFinalizationExplanationCode>([
  "handoff_finalization_invoked",
  "handoff_finalization_blocked_unsupported"
]);
const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function validateAndCloneAttemptHandoffFinalizationReportReadyEntry(
  entry: unknown,
  context: string
): AttemptHandoffFinalizationReportReadyEntry {
  if (!isRecord(entry)) {
    throw new ValidationError(`${context} requires entry to be an object.`);
  }

  const reportReadyEntry =
    entry as unknown as AttemptHandoffFinalizationReportReadyEntry;
  const taskId = normalizeRequiredString(
    reportReadyEntry.taskId,
    "entry.taskId",
    context
  );
  const attemptId = normalizeRequiredString(
    reportReadyEntry.attemptId,
    "entry.attemptId",
    context
  );
  const runtime = normalizeRequiredString(
    reportReadyEntry.runtime,
    "entry.runtime",
    context
  );
  validateAttemptStatus(reportReadyEntry.status, "entry.status", context);
  validateAttemptSourceKind(
    reportReadyEntry.sourceKind,
    "entry.sourceKind",
    context
  );
  validateBlockingReasons(
    reportReadyEntry.blockingReasons,
    "entry.blockingReasons",
    context
  );

  if (typeof reportReadyEntry.invoked !== "boolean") {
    throw new ValidationError(
      `${context} requires entry.invoked to be a boolean.`
    );
  }

  if (!validExplanationCodes.has(reportReadyEntry.explanationCode)) {
    throw new ValidationError(
      `${context} requires entry.explanationCode to use the existing handoff-finalization explanation vocabulary.`
    );
  }

  if (
    reportReadyEntry.invoked &&
    reportReadyEntry.explanationCode !== "handoff_finalization_invoked"
  ) {
    throw new ValidationError(
      `${context} requires invoked entries to use "handoff_finalization_invoked".`
    );
  }

  if (
    !reportReadyEntry.invoked &&
    reportReadyEntry.explanationCode !==
      "handoff_finalization_blocked_unsupported"
  ) {
    throw new ValidationError(
      `${context} requires blocked entries to use "handoff_finalization_blocked_unsupported".`
    );
  }

  if (reportReadyEntry.invoked && reportReadyEntry.blockingReasons.length > 0) {
    throw new ValidationError(
      `${context} requires invoked entries to use empty blockingReasons.`
    );
  }

  if (!reportReadyEntry.invoked && reportReadyEntry.blockingReasons.length === 0) {
    throw new ValidationError(
      `${context} requires blocked entries to keep blockingReasons.`
    );
  }

  return {
    taskId,
    attemptId,
    runtime,
    status: reportReadyEntry.status,
    sourceKind: reportReadyEntry.sourceKind,
    explanationCode: reportReadyEntry.explanationCode,
    invoked: reportReadyEntry.invoked,
    blockingReasons: [...reportReadyEntry.blockingReasons]
  };
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  context: string
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `${context} requires ${fieldName} to be a non-empty string.`
    );
  }

  return value.trim();
}

function validateAttemptStatus(
  value: unknown,
  fieldName: string,
  context: string
): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `${context} requires ${fieldName} to use the existing attempt status vocabulary.`
    );
  }
}

function validateAttemptSourceKind(
  value: unknown,
  fieldName: string,
  context: string
): void {
  if (
    value !== undefined &&
    (typeof value !== "string" ||
      !validAttemptSourceKinds.has(value as AttemptSourceKind))
  ) {
    throw new ValidationError(
      `${context} requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function validateBlockingReasons(
  value: unknown,
  fieldName: string,
  context: string
): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${context} requires ${fieldName} to be an array.`);
  }

  for (let index = 0; index < value.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(value, index) ||
      typeof value[index] !== "string" ||
      !validBlockingReasons.has(
        value[index] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `${context} requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
