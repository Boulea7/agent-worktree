import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import { readSelectionValue } from "./entry-validation.js";
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
    readSelectionValue(
      reportReadyEntry,
      "taskId",
      `${context} requires entry.taskId to be a non-empty string.`
    ),
    "entry.taskId",
    context
  );
  const attemptId = normalizeRequiredString(
    readSelectionValue(
      reportReadyEntry,
      "attemptId",
      `${context} requires entry.attemptId to be a non-empty string.`
    ),
    "entry.attemptId",
    context
  );
  const runtime = normalizeRequiredString(
    readSelectionValue(
      reportReadyEntry,
      "runtime",
      `${context} requires entry.runtime to be a non-empty string.`
    ),
    "entry.runtime",
    context
  );
  const status = readSelectionValue(
    reportReadyEntry,
    "status",
    `${context} requires entry.status to use the existing attempt status vocabulary.`
  );
  validateAttemptStatus(status, "entry.status", context);
  const sourceKind = readSelectionValue(
    reportReadyEntry,
    "sourceKind",
    `${context} requires entry.sourceKind to use the existing attempt source-kind vocabulary when provided.`
  );
  validateAttemptSourceKind(
    sourceKind,
    "entry.sourceKind",
    context
  );
  validateBlockingReasons(
    readSelectionValue(
      reportReadyEntry,
      "blockingReasons",
      `${context} requires entry.blockingReasons to be an array.`
    ),
    "entry.blockingReasons",
    context
  );

  const invoked = readSelectionValue(
    reportReadyEntry,
    "invoked",
    `${context} requires entry.invoked to be a boolean.`
  );

  if (typeof invoked !== "boolean") {
    throw new ValidationError(
      `${context} requires entry.invoked to be a boolean.`
    );
  }

  const explanationCode = readSelectionValue(
    reportReadyEntry,
    "explanationCode",
    `${context} requires entry.explanationCode to use the existing handoff-finalization explanation vocabulary.`
  );

  if (!validExplanationCodes.has(explanationCode as AttemptHandoffFinalizationExplanationCode)) {
    throw new ValidationError(
      `${context} requires entry.explanationCode to use the existing handoff-finalization explanation vocabulary.`
    );
  }

  if (
    invoked &&
    explanationCode !== "handoff_finalization_invoked"
  ) {
    throw new ValidationError(
      `${context} requires invoked entries to use "handoff_finalization_invoked".`
    );
  }

  if (
    !invoked &&
    explanationCode !== "handoff_finalization_blocked_unsupported"
  ) {
    throw new ValidationError(
      `${context} requires blocked entries to use "handoff_finalization_blocked_unsupported".`
    );
  }

  const blockingReasons = reportReadyEntry.blockingReasons;

  if (invoked && blockingReasons.length > 0) {
    throw new ValidationError(
      `${context} requires invoked entries to use empty blockingReasons.`
    );
  }

  if (!invoked && blockingReasons.length === 0) {
    throw new ValidationError(
      `${context} requires blocked entries to keep blockingReasons.`
    );
  }

  return {
    taskId,
    attemptId,
    runtime,
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined,
    explanationCode: explanationCode as AttemptHandoffFinalizationExplanationCode,
    invoked,
    blockingReasons: [...blockingReasons]
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
    let entryValue: unknown;

    try {
      entryValue = value[index];
    } catch {
      throw new ValidationError(
        `${context} requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }

    if (
      !Object.prototype.hasOwnProperty.call(value, index) ||
      typeof entryValue !== "string" ||
      !validBlockingReasons.has(
        entryValue as AttemptHandoffFinalizationConsumerBlockingReason
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
