import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import { readSelectionValue } from "./entry-validation.js";
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

  if (
    readSelectionValue(
      summary,
      "outcomeBasis",
      'Attempt handoff finalization explanation summary requires summary.outcomeBasis to be "handoff_finalization_apply_batch".'
    ) !== attemptHandoffFinalizationOutcomeBasis
  ) {
    throw new ValidationError(
      'Attempt handoff finalization explanation summary requires summary.outcomeBasis to be "handoff_finalization_apply_batch".'
    );
  }

  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "resultCount",
      "Attempt handoff finalization explanation summary requires summary.resultCount to be a non-negative integer."
    ),
    "summary.resultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "invokedResultCount",
      "Attempt handoff finalization explanation summary requires summary.invokedResultCount to be a non-negative integer."
    ),
    "summary.invokedResultCount"
  );
  validateNonNegativeInteger(
    readSelectionValue(
      summary,
      "blockedResultCount",
      "Attempt handoff finalization explanation summary requires summary.blockedResultCount to be a non-negative integer."
    ),
    "summary.blockedResultCount"
  );
  const summaryBlockingReasons = readSelectionValue(
    summary,
    "blockingReasons",
    "Attempt handoff finalization explanation summary requires summary.blockingReasons to be an array."
  );
  validateBlockingReasons(summaryBlockingReasons, "summary.blockingReasons");

  const outcomesValue = readSelectionValue(
    summary,
    "outcomes",
    "Attempt handoff finalization explanation summary requires summary.outcomes to be an array."
  );

  if (!Array.isArray(outcomesValue)) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires summary.outcomes to be an array."
    );
  }

  const outcomes = validateOutcomeArray(
    outcomesValue as AttemptHandoffFinalizationOutcome[],
    "summary.outcomes"
  );
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

  if (
    !stringArraysEqual(
      summaryBlockingReasons as string[],
      blockingReasons
    )
  ) {
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

  const taskId = normalizeRequiredString(
    readSelectionValue(
      outcomeRecord,
      "taskId",
      "Attempt handoff finalization explanation summary requires outcome.taskId to be a non-empty string."
    ),
    "outcome.taskId"
  );
  const attemptId = normalizeRequiredString(
    readSelectionValue(
      outcomeRecord,
      "attemptId",
      "Attempt handoff finalization explanation summary requires outcome.attemptId to be a non-empty string."
    ),
    "outcome.attemptId"
  );
  const runtime = normalizeRequiredString(
    readSelectionValue(
      outcomeRecord,
      "runtime",
      "Attempt handoff finalization explanation summary requires outcome.runtime to be a non-empty string."
    ),
    "outcome.runtime"
  );
  const status = readSelectionValue(
    outcomeRecord,
    "status",
    "Attempt handoff finalization explanation summary requires outcome.status to use the existing attempt status vocabulary."
  );
  validateAttemptStatus(status, "outcome.status");
  const sourceKind = readSelectionValue(
    outcomeRecord,
    "sourceKind",
    "Attempt handoff finalization explanation summary requires outcome.sourceKind to use the existing attempt source-kind vocabulary when provided."
  );
  validateAttemptSourceKind(sourceKind, "outcome.sourceKind");

  const invoked = readSelectionValue(
    outcomeRecord,
    "invoked",
    "Attempt handoff finalization explanation summary requires outcome.invoked to be a boolean."
  );

  if (typeof invoked !== "boolean") {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires outcome.invoked to be a boolean."
    );
  }

  validateBlockingReasons(
    readSelectionValue(
      outcomeRecord,
      "blockingReasons",
      "Attempt handoff finalization explanation summary requires outcome.blockingReasons to be an array."
    ),
    "outcome.blockingReasons"
  );

  const blockingReasons = outcomeRecord.blockingReasons;

  if (invoked && blockingReasons.length > 0) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires invoked outcomes to use empty blockingReasons."
    );
  }

  if (!invoked && blockingReasons.length === 0) {
    throw new ValidationError(
      "Attempt handoff finalization explanation summary requires blocked outcomes to keep blockingReasons."
    );
  }

  return {
    taskId,
    attemptId,
    runtime,
    status: status as AttemptStatus,
    sourceKind: sourceKind as AttemptSourceKind | undefined,
    invoked,
    blockingReasons: [...blockingReasons]
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
    let entryValue: unknown;

    try {
      entryValue = value[index];
    } catch {
      throw new ValidationError(
        `Attempt handoff finalization explanation summary requires ${fieldName} to use the existing handoff-finalization blocker vocabulary.`
      );
    }

    if (
      !hasOwnIndex(value, index) ||
      typeof entryValue !== "string" ||
      !validBlockingReasons.has(
        entryValue as AttemptHandoffFinalizationConsumerBlockingReason
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
