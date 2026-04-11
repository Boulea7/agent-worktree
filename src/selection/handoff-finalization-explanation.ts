import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import {
  validateDownstreamSingleTaskBoundary,
  validateDownstreamUniqueIdentity
} from "./downstream-identity-guardrails.js";
import type {
  AttemptHandoffFinalizationConsumerBlockingReason,
  AttemptHandoffFinalizationExplanationCode,
  AttemptHandoffFinalizationExplanationEntry,
  AttemptHandoffFinalizationExplanationSummary,
  AttemptHandoffFinalizationOutcome,
  AttemptHandoffFinalizationOutcomeSummary
} from "./types.js";

const attemptHandoffFinalizationExplanationBasis =
  "handoff_finalization_outcome_summary" as const;
const attemptHandoffFinalizationOutcomeBasis =
  "handoff_finalization_apply_batch" as const;

const validBlockingReasons =
  new Set<AttemptHandoffFinalizationConsumerBlockingReason>([
    "handoff_finalization_unsupported"
  ]);
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function deriveAttemptHandoffFinalizationExplanationSummary(
  summary: AttemptHandoffFinalizationOutcomeSummary | undefined
): AttemptHandoffFinalizationExplanationSummary | undefined {
  if (summary === undefined) {
    return undefined;
  }

  const outcomes = validateSummary(summary);

  const results = outcomes.map(deriveExplanationEntry);

  return {
    explanationBasis: attemptHandoffFinalizationExplanationBasis,
    results,
    invokedResults: results.filter((entry) => entry.invoked),
    blockedResults: results.filter((entry) => !entry.invoked)
  };
}

function validateSummary(
  summary: AttemptHandoffFinalizationOutcomeSummary
): AttemptHandoffFinalizationOutcome[] {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary to be an object."
    );
  }

  if (summary.outcomeBasis !== attemptHandoffFinalizationOutcomeBasis) {
    throw new ValidationError(
      'Attempt handoff finalization explanation summary requires summary.outcomeBasis to be "handoff_finalization_apply_batch".'
    );
  }

  validateNonNegativeInteger(summary.resultCount, "summary.resultCount");
  validateNonNegativeInteger(
    summary.invokedResultCount,
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    summary.blockedResultCount,
    "summary.blockedResultCount"
  );
  validateBlockingReasons(summary.blockingReasons, "summary.blockingReasons");

  if (!Array.isArray(summary.outcomes)) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.outcomes to be an array."
    );
  }

  const outcomes = validateOutcomeArray(summary.outcomes, "summary.outcomes");
  validateDownstreamSingleTaskBoundary(
    outcomes,
    "Attempt handoff finalization explanation summary requires summary.outcomes from a single taskId."
  );
  validateDownstreamUniqueIdentity(
    outcomes,
    "Attempt handoff finalization explanation summary requires summary.outcomes to use unique (taskId, attemptId, runtime) identities."
  );

  if (summary.resultCount !== outcomes.length) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.resultCount to match summary.outcomes.length."
    );
  }

  const invokedResultCount = outcomes.filter((outcome) => outcome.invoked).length;
  const blockedResultCount = outcomes.length - invokedResultCount;

  if (summary.invokedResultCount !== invokedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.invokedResultCount to match the invoked count derived from summary.outcomes."
    );
  }

  if (summary.blockedResultCount !== blockedResultCount) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.blockedResultCount to match the blocked count derived from summary.outcomes."
    );
  }

  const blockingReasons = collectBlockingReasons(outcomes);

  if (!stringArraysEqual(summary.blockingReasons, blockingReasons)) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.blockingReasons to match the stable blocking-reason union derived from summary.outcomes."
    );
  }

  return outcomes;
}

function validateOutcome(outcome: unknown): AttemptHandoffFinalizationOutcome {
  if (!isRecord(outcome)) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.outcomes entries to be objects."
    );
  }

  const outcomeRecord = outcome as unknown as AttemptHandoffFinalizationOutcome;

  const taskId = normalizeRequiredString(outcomeRecord.taskId, "outcome.taskId");
  const attemptId = normalizeRequiredString(
    outcomeRecord.attemptId,
    "outcome.attemptId"
  );
  const runtime = normalizeRequiredString(outcomeRecord.runtime, "outcome.runtime");
  validateAttemptStatus(outcomeRecord.status, "outcome.status");
  validateAttemptSourceKind(outcomeRecord.sourceKind, "outcome.sourceKind");

  if (typeof outcomeRecord.invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires outcome.invoked to be a boolean."
    );
  }

  validateBlockingReasons(
    outcomeRecord.blockingReasons,
    "outcome.blockingReasons"
  );

  if (outcomeRecord.invoked && outcomeRecord.blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires invoked outcomes to use empty blockingReasons."
    );
  }

  if (!outcomeRecord.invoked && outcomeRecord.blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires blocked outcomes to keep blockingReasons."
    );
  }

  return {
    taskId,
    attemptId,
    runtime,
    status: outcomeRecord.status,
    sourceKind: outcomeRecord.sourceKind,
    invoked: outcomeRecord.invoked,
    blockingReasons: [...outcomeRecord.blockingReasons]
  };
}

function validateOutcomeArray(
  outcomes: readonly AttemptHandoffFinalizationOutcome[],
  fieldName: string
): AttemptHandoffFinalizationOutcome[] {
  const validatedOutcomes: AttemptHandoffFinalizationOutcome[] = [];

  for (let index = 0; index < outcomes.length; index += 1) {
    const outcome = outcomes[index];

    if (!hasOwnIndex(outcomes, index)) {
      throw new ValidationError(
        `Attempt handoff finalization explanation summary requires ${fieldName}[${index}] to be an object.`
      );
    }

    validatedOutcomes.push(validateOutcome(outcome));
  }

  return validatedOutcomes;
}

function deriveExplanationEntry(
  outcome: AttemptHandoffFinalizationOutcome
): AttemptHandoffFinalizationExplanationEntry {
  const explanationCode: AttemptHandoffFinalizationExplanationCode =
    outcome.invoked
      ? "handoff_finalization_invoked"
      : "handoff_finalization_blocked_unsupported";

  return {
    outcome: {
      taskId: outcome.taskId,
      attemptId: outcome.attemptId,
      runtime: outcome.runtime,
      status: outcome.status,
      sourceKind: outcome.sourceKind,
      invoked: outcome.invoked,
      blockingReasons: [...outcome.blockingReasons]
    },
    explanationCode,
    invoked: outcome.invoked,
    blockingReasons: [...outcome.blockingReasons]
  };
}

function validateNonNegativeInteger(value: unknown, fieldName: string): void {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      `Attempt handoff finalization explanation summary requires ${fieldName} to be a non-negative integer.`
    );
  }
}

function validateBlockingReasons(value: unknown, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Attempt handoff finalization explanation summary requires ${fieldName} to be an array.`
    );
  }

  for (let index = 0; index < value.length; index += 1) {
    if (
      !hasOwnIndex(value, index) ||
      typeof value[index] !== "string" ||
      !validBlockingReasons.has(
        value[index] as AttemptHandoffFinalizationConsumerBlockingReason
      )
    ) {
      throw new ValidationError(
        `Attempt handoff finalization explanation summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }
  }
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

function validateAttemptStatus(value: unknown, fieldName: string): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      `Attempt handoff finalization explanation summary requires ${fieldName} to use the existing attempt status vocabulary.`
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
      `Attempt handoff finalization explanation summary requires ${fieldName} to use the existing attempt source-kind vocabulary when provided.`
    );
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Attempt handoff finalization explanation summary requires ${fieldName} to be a non-empty string.`
    );
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ValidationError(
      `Attempt handoff finalization explanation summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return normalized;
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

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
