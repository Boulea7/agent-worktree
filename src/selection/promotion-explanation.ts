import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  attemptStatuses,
  type AttemptSourceKind,
  type AttemptStatus
} from "../manifest/types.js";
import {
  attemptVerificationOverallOutcomes,
  attemptVerificationRequiredOutcomes,
  type AttemptVerificationCounts,
  type AttemptVerificationSummary
} from "../verification/types.js";
import type {
  AttemptPromotionAuditCandidate,
  AttemptPromotionExplanationCandidate,
  AttemptPromotionExplanationCode,
  AttemptPromotionExplanationSummary,
  AttemptPromotionReport,
  AttemptSelectedIdentity
} from "./types.js";
import {
  accessSelectionValue,
  normalizeSelectionTrimmedStringArray,
  rethrowSelectionAccessError
} from "./entry-validation.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";

const ATTEMPT_PROMOTION_EXPLANATION_BASIS = "promotion_report" as const;
const ATTEMPT_PROMOTION_REPORT_BASIS = "promotion_audit_summary" as const;
const validAttemptStatuses = new Set<AttemptStatus>(attemptStatuses);
const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);
const validVerificationOverallOutcomes = new Set<string>(
  attemptVerificationOverallOutcomes
);
const validVerificationRequiredOutcomes = new Set<string>(
  attemptVerificationRequiredOutcomes
);

export function deriveAttemptPromotionExplanationSummary(
  report: AttemptPromotionReport
): AttemptPromotionExplanationSummary {
  if (!isRecord(report)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report to be an object."
    );
  }

  try {
    const normalizedReport = normalizePromotionReportInput(report);

    validateReportBasis(normalizedReport);
    validateTaskId(normalizedReport.taskId);
    const normalizedTaskId = normalizeOptionalTaskId(normalizedReport.taskId);
    validatePromotionReport(normalizedReport, normalizedTaskId);

    const candidates = normalizedReport.candidates.map((candidate) =>
      deriveExplanationCandidate(
        candidate,
        normalizedTaskId,
        normalizedReport.selectedIdentity
      )
    );
    const selected =
      candidates[0] === undefined
        ? undefined
        : cloneExplanationCandidate(candidates[0]);

    return {
      explanationBasis: ATTEMPT_PROMOTION_EXPLANATION_BASIS,
      taskId: normalizedTaskId,
      selectedAttemptId: selected?.attemptId,
      selectedIdentity: deriveSelectedIdentity(normalizedTaskId, candidates[0]),
      candidateCount: normalizedReport.candidates.length,
      comparableCandidateCount: countComparableCandidates(normalizedReport.candidates),
      promotionReadyCandidateCount: countPromotionReadyCandidates(
        normalizedReport.candidates
      ),
      recommendedForPromotion:
        normalizedReport.candidates[0]?.recommendedForPromotion ?? false,
      selected,
      candidates
    };
  } catch (error) {
    rethrowSelectionAccessError(
      error,
      "Attempt promotion explanation summary requires report to be a readable object."
    );
  }
}

function normalizePromotionReportInput(
  report: Record<string, unknown>
): AttemptPromotionReport {
  const readableObjectMessage =
    "Attempt promotion explanation summary requires report to be a readable object.";
  const candidates = accessSelectionValue(report, "candidates");

  if (!Array.isArray(candidates)) {
    return {
      reportBasis: accessSelectionValue(report, "reportBasis") as AttemptPromotionReport["reportBasis"],
      taskId: accessSelectionValue(report, "taskId") as AttemptPromotionReport["taskId"],
      selectedAttemptId: accessSelectionValue(report, "selectedAttemptId") as AttemptPromotionReport["selectedAttemptId"],
      selectedIdentity: normalizeSelectedIdentitySnapshot(
        accessSelectionValue(report, "selectedIdentity"),
        readableObjectMessage
      ),
      candidateCount: accessSelectionValue(report, "candidateCount") as AttemptPromotionReport["candidateCount"],
      comparableCandidateCount: accessSelectionValue(report, "comparableCandidateCount") as AttemptPromotionReport["comparableCandidateCount"],
      promotionReadyCandidateCount: accessSelectionValue(report, "promotionReadyCandidateCount") as AttemptPromotionReport["promotionReadyCandidateCount"],
      recommendedForPromotion: accessSelectionValue(report, "recommendedForPromotion") as AttemptPromotionReport["recommendedForPromotion"],
      selected: accessSelectionValue(report, "selected") as AttemptPromotionReport["selected"],
      candidates: candidates as AttemptPromotionReport["candidates"],
      promotionReadyCandidates: accessSelectionValue(report, "promotionReadyCandidates") as AttemptPromotionReport["promotionReadyCandidates"],
      nonPromotionReadyCandidates: accessSelectionValue(report, "nonPromotionReadyCandidates") as AttemptPromotionReport["nonPromotionReadyCandidates"],
      pendingCandidates: accessSelectionValue(report, "pendingCandidates") as AttemptPromotionReport["pendingCandidates"]
    };
  }

  validateCandidateEntries(candidates);

  return {
    reportBasis: accessSelectionValue(report, "reportBasis") as AttemptPromotionReport["reportBasis"],
    taskId: accessSelectionValue(report, "taskId") as AttemptPromotionReport["taskId"],
    selectedAttemptId: accessSelectionValue(report, "selectedAttemptId") as AttemptPromotionReport["selectedAttemptId"],
    selectedIdentity: normalizeSelectedIdentitySnapshot(
      accessSelectionValue(report, "selectedIdentity"),
      readableObjectMessage
    ),
    candidateCount: accessSelectionValue(report, "candidateCount") as AttemptPromotionReport["candidateCount"],
    comparableCandidateCount: accessSelectionValue(report, "comparableCandidateCount") as AttemptPromotionReport["comparableCandidateCount"],
    promotionReadyCandidateCount: accessSelectionValue(report, "promotionReadyCandidateCount") as AttemptPromotionReport["promotionReadyCandidateCount"],
    recommendedForPromotion: accessSelectionValue(report, "recommendedForPromotion") as AttemptPromotionReport["recommendedForPromotion"],
    selected: accessSelectionValue(report, "selected") as AttemptPromotionReport["selected"],
    candidates: candidates.map((candidate) =>
      normalizePromotionAuditCandidateSnapshot(candidate, readableObjectMessage)
    ),
    promotionReadyCandidates: accessSelectionValue(report, "promotionReadyCandidates") as AttemptPromotionReport["promotionReadyCandidates"],
    nonPromotionReadyCandidates: accessSelectionValue(report, "nonPromotionReadyCandidates") as AttemptPromotionReport["nonPromotionReadyCandidates"],
    pendingCandidates: accessSelectionValue(report, "pendingCandidates") as AttemptPromotionReport["pendingCandidates"]
  };
}

function validateReportBasis(report: AttemptPromotionReport): void {
  if (report.reportBasis !== ATTEMPT_PROMOTION_REPORT_BASIS) {
    throw new ValidationError(
      'Attempt promotion explanation summary requires report.reportBasis to be "promotion_audit_summary".'
    );
  }
}

function validateTaskId(value: unknown): void {
  if (
    value !== undefined &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.taskId to be a non-empty string when provided."
    );
  }
}

function validatePromotionReport(
  report: AttemptPromotionReport,
  normalizedTaskId: AttemptPromotionReport["taskId"]
): void {
  if (!Array.isArray(report.candidates)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.candidates to be an array."
    );
  }

  validateCandidateEntries(report.candidates);

  if (report.candidateCount !== report.candidates.length) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.candidateCount to match report.candidates.length."
    );
  }

  if (report.candidates.length === 0) {
    if (report.selectedAttemptId !== undefined) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.selectedAttemptId to be undefined when candidates are empty."
      );
    }

    if (report.selected !== undefined) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.selected to be undefined when candidates are empty."
      );
    }
    if (report.selectedIdentity !== undefined) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.selectedIdentity to be undefined when candidates are empty."
      );
    }
  } else if (
    normalizeComparableString(report.selectedAttemptId) !==
    report.candidates[0]?.attemptId
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedAttemptId to match the first candidate when candidates are present."
    );
  }

  report.candidates.forEach(validatePromotionAuditCandidate);
  validateSelectedIdentity(
    normalizedTaskId,
    report.selectedIdentity,
    report.candidates[0]
  );
  validateCanonicalCandidateIdentity(normalizedTaskId, report.candidates);
  validateSelectedCandidate(report.selected, report.candidates.length);
  validateCandidateGroupEntries(
    report.promotionReadyCandidates,
    "report.promotionReadyCandidates"
  );
  validateCandidateGroupEntries(
    report.nonPromotionReadyCandidates,
    "report.nonPromotionReadyCandidates"
  );
  validateCandidateGroupEntries(report.pendingCandidates, "report.pendingCandidates");

  if (
    !promotionAuditCandidatesEqual(report.selected, report.candidates[0])
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selected to match the first candidate."
    );
  }

  const comparableCandidateCount = countComparableCandidates(report.candidates);

  if (report.comparableCandidateCount !== comparableCandidateCount) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.comparableCandidateCount to match the count derived from report.candidates."
    );
  }

  const promotionReadyCandidateCount = countPromotionReadyCandidates(
    report.candidates
  );

  if (report.promotionReadyCandidateCount !== promotionReadyCandidateCount) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.promotionReadyCandidateCount to match the count derived from report.candidates."
    );
  }

  const recommendedForPromotion =
    report.candidates[0]?.recommendedForPromotion ?? false;

  if (report.recommendedForPromotion !== recommendedForPromotion) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.recommendedForPromotion to match the selected report candidate."
    );
  }

  const promotionReadyCandidates = report.candidates.filter(
    (candidate) => candidate.recommendedForPromotion
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.promotionReadyCandidates,
      promotionReadyCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.promotionReadyCandidates to match the stable filtered promotion-ready subgroup."
    );
  }

  const nonPromotionReadyCandidates = report.candidates.filter(
    (candidate) => !candidate.recommendedForPromotion
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.nonPromotionReadyCandidates,
      nonPromotionReadyCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.nonPromotionReadyCandidates to match the stable filtered non-promotion-ready subgroup."
    );
  }

  const pendingCandidates = report.candidates.filter(
    (candidate) => candidate.pendingCheckNames.length > 0
  );

  if (
    !promotionAuditCandidateArraysEqual(
      report.pendingCandidates,
      pendingCandidates
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.pendingCandidates to match the stable filtered pending subgroup."
    );
  }
}

function validateCanonicalCandidateIdentity(
  taskId: AttemptPromotionReport["taskId"],
  candidates: readonly AttemptPromotionAuditCandidate[]
): void {
  validateDownstreamIdentityIngress(
    candidates.map((candidate) => ({
      taskId,
      attemptId: candidate.attemptId,
      runtime: candidate.runtime
    })),
    {
      required:
        "Attempt promotion explanation summary requires report.taskId together with candidate.attemptId and candidate.runtime to be non-empty strings when candidates are present.",
      singleTask:
        "Attempt promotion explanation summary requires report.candidates to remain within report.taskId.",
      unique:
        "Attempt promotion explanation summary requires report.candidates to use unique (taskId, attemptId, runtime) identities."
    }
  );
}

function validateCandidateEntries(
  candidates: readonly unknown[]
): void {
  for (let index = 0; index < candidates.length; index += 1) {
    if (!hasOwnIndex(candidates, index) || !isRecord(candidates[index])) {
      throw new ValidationError(
        "Attempt promotion explanation summary requires report.candidates entries to be objects."
      );
    }
  }
}

function validateSelectedCandidate(
  selected: AttemptPromotionReport["selected"],
  candidateCount: number
): void {
  if (selected === undefined) {
    return;
  }

  if (!isRecord(selected)) {
    throw new ValidationError(
      candidateCount === 0
        ? "Attempt promotion explanation summary requires report.selected to be undefined when candidates are empty."
        : "Attempt promotion explanation summary requires report.selected to be an object when candidates are present."
    );
  }
}

function validateCandidateGroupEntries(
  candidates: unknown,
  fieldName: string
): void {
  if (!Array.isArray(candidates)) {
    return;
  }

  for (let index = 0; index < candidates.length; index += 1) {
    if (!hasOwnIndex(candidates, index) || !isRecord(candidates[index])) {
      throw new ValidationError(
        `Attempt promotion explanation summary requires ${fieldName} entries to be objects.`
      );
    }
  }
}

function countComparableCandidates(
  candidates: readonly AttemptPromotionAuditCandidate[]
): number {
  return candidates.filter((candidate) => candidate.summary.hasComparablePayload)
    .length;
}

function countPromotionReadyCandidates(
  candidates: readonly AttemptPromotionAuditCandidate[]
): number {
  return candidates.filter((candidate) => candidate.recommendedForPromotion)
    .length;
}

function validatePromotionAuditCandidate(
  candidate: AttemptPromotionAuditCandidate
): void {
  validateNonEmptyString(candidate.attemptId, "candidate.attemptId");
  validateNonEmptyString(candidate.runtime, "candidate.runtime");
  validateAttemptStatus(candidate.status);
  validateAttemptSourceKind(candidate.sourceKind);

  if (typeof candidate.recommendedForPromotion !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.recommendedForPromotion to be a boolean."
    );
  }

  validateAttemptVerificationSummary(candidate.summary);

  if (candidate.recommendedForPromotion !== candidate.summary.isSelectionReady) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.recommendedForPromotion to match candidate.summary.isSelectionReady."
    );
  }

  validateCheckNameList(
    candidate.blockingRequiredCheckNames,
    "candidate.blockingRequiredCheckNames"
  );
  validateCheckNameList(
    candidate.failedOrErrorCheckNames,
    "candidate.failedOrErrorCheckNames"
  );
  validateCheckNameList(candidate.pendingCheckNames, "candidate.pendingCheckNames");
  validateCheckNameList(candidate.skippedCheckNames, "candidate.skippedCheckNames");
}

function normalizePromotionAuditCandidateSnapshot(
  candidate: unknown,
  readableObjectMessage: string
): AttemptPromotionAuditCandidate {
  if (!isRecord(candidate)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.candidates entries to be objects."
    );
  }

  return {
    attemptId: validateNonEmptyString(
      accessSelectionValue(candidate, "attemptId"),
      "candidate.attemptId"
    ),
    runtime: validateNonEmptyString(
      accessSelectionValue(candidate, "runtime"),
      "candidate.runtime"
    ),
    status: accessSelectionValue(candidate, "status") as AttemptPromotionAuditCandidate["status"],
    sourceKind: accessSelectionValue(candidate, "sourceKind") as AttemptPromotionAuditCandidate["sourceKind"],
    summary: normalizeAttemptVerificationSummarySnapshot(
      accessSelectionValue(candidate, "summary"),
      readableObjectMessage
    ),
    recommendedForPromotion: accessSelectionValue(candidate, "recommendedForPromotion") as AttemptPromotionAuditCandidate["recommendedForPromotion"],
    blockingRequiredCheckNames: normalizeCheckNameList(
      accessSelectionValue(candidate, "blockingRequiredCheckNames"),
      "candidate.blockingRequiredCheckNames"
    ),
    failedOrErrorCheckNames: normalizeCheckNameList(
      accessSelectionValue(candidate, "failedOrErrorCheckNames"),
      "candidate.failedOrErrorCheckNames"
    ),
    pendingCheckNames: normalizeCheckNameList(
      accessSelectionValue(candidate, "pendingCheckNames"),
      "candidate.pendingCheckNames"
    ),
    skippedCheckNames: normalizeCheckNameList(
      accessSelectionValue(candidate, "skippedCheckNames"),
      "candidate.skippedCheckNames"
    )
  };
}

function deriveExplanationCandidate(
  candidate: AttemptPromotionAuditCandidate,
  taskId: AttemptPromotionReport["taskId"],
  selectedIdentity: AttemptPromotionReport["selectedIdentity"]
): AttemptPromotionExplanationCandidate {
  const isSelected =
    normalizeComparableString(taskId) !== undefined &&
    normalizeComparableString(selectedIdentity?.taskId) ===
      normalizeComparableString(taskId) &&
    normalizeComparableString(selectedIdentity?.attemptId) ===
      normalizeComparableString(candidate.attemptId) &&
    normalizeComparableString(selectedIdentity?.runtime) ===
      normalizeComparableString(candidate.runtime);

  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    hasComparablePayload: candidate.summary.hasComparablePayload,
    isSelected,
    recommendedForPromotion: candidate.recommendedForPromotion,
    explanationCode: deriveExplanationCode(candidate, isSelected),
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames],
    skippedCheckNames: [...candidate.skippedCheckNames]
  };
}

function deriveSelectedIdentity(
  taskId: AttemptPromotionReport["taskId"],
  candidate: AttemptPromotionExplanationCandidate | undefined
): AttemptSelectedIdentity | undefined {
  const normalizedTaskId = normalizeComparableString(taskId);
  const normalizedAttemptId = normalizeComparableString(candidate?.attemptId);
  const normalizedRuntime = normalizeComparableString(candidate?.runtime);

  if (
    normalizedTaskId === undefined ||
    normalizedAttemptId === undefined ||
    normalizedRuntime === undefined
  ) {
    return undefined;
  }

  return {
    taskId: normalizedTaskId,
    attemptId: normalizedAttemptId,
    runtime: normalizedRuntime
  };
}

function validateSelectedIdentity(
  taskId: AttemptPromotionReport["taskId"],
  selectedIdentity: AttemptPromotionReport["selectedIdentity"],
  candidate: AttemptPromotionAuditCandidate | undefined
): void {
  if (selectedIdentity === undefined) {
    if (candidate === undefined) {
      return;
    }

    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedIdentity to be defined when candidates are present."
    );
  }

  if (!isRecord(selectedIdentity)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedIdentity to be an object when provided."
    );
  }

  const normalizedTaskId = validateNonEmptyString(
    selectedIdentity.taskId,
    "report.selectedIdentity.taskId"
  );
  const normalizedAttemptId = validateNonEmptyString(
    selectedIdentity.attemptId,
    "report.selectedIdentity.attemptId"
  );
  const normalizedRuntime = validateNonEmptyString(
    selectedIdentity.runtime,
    "report.selectedIdentity.runtime"
  );

  if (
    taskId === undefined ||
    candidate === undefined ||
    normalizedTaskId !== normalizeComparableString(taskId) ||
    normalizedAttemptId !== normalizeComparableString(candidate.attemptId) ||
    normalizedRuntime !== normalizeComparableString(candidate.runtime)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedIdentity to match the first candidate."
    );
  }
}

function normalizeSelectedIdentitySnapshot(
  selectedIdentity: unknown,
  readableObjectMessage: string
): AttemptPromotionReport["selectedIdentity"] {
  if (selectedIdentity === undefined) {
    return undefined;
  }

  if (!isRecord(selectedIdentity)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires report.selectedIdentity to be an object when provided."
    );
  }

  return {
    taskId: accessSelectionValue(selectedIdentity, "taskId") as AttemptSelectedIdentity["taskId"],
    attemptId: accessSelectionValue(selectedIdentity, "attemptId") as AttemptSelectedIdentity["attemptId"],
    runtime: accessSelectionValue(selectedIdentity, "runtime") as AttemptSelectedIdentity["runtime"]
  };
}

function cloneExplanationCandidate(
  candidate: AttemptPromotionExplanationCandidate
): AttemptPromotionExplanationCandidate {
  return {
    attemptId: candidate.attemptId,
    runtime: candidate.runtime,
    status: candidate.status,
    sourceKind: candidate.sourceKind,
    hasComparablePayload: candidate.hasComparablePayload,
    isSelected: candidate.isSelected,
    recommendedForPromotion: candidate.recommendedForPromotion,
    explanationCode: candidate.explanationCode,
    blockingRequiredCheckNames: [...candidate.blockingRequiredCheckNames],
    failedOrErrorCheckNames: [...candidate.failedOrErrorCheckNames],
    pendingCheckNames: [...candidate.pendingCheckNames],
    skippedCheckNames: [...candidate.skippedCheckNames]
  };
}

function normalizeOptionalTaskId(
  value: AttemptPromotionReport["taskId"]
): AttemptPromotionReport["taskId"] {
  return value === undefined ? undefined : value.trim();
}


function normalizeComparableString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}

function deriveExplanationCode(
  candidate: AttemptPromotionAuditCandidate,
  isSelected: boolean
): AttemptPromotionExplanationCode {
  if (isSelected) {
    return "selected";
  }

  if (candidate.recommendedForPromotion) {
    return "promotion_ready";
  }

  if (candidate.blockingRequiredCheckNames.length > 0) {
    const hasRequiredSkipped = candidate.blockingRequiredCheckNames.some((name) =>
      candidate.skippedCheckNames.includes(name)
    );
    const hasRequiredPending = candidate.blockingRequiredCheckNames.some((name) =>
      candidate.pendingCheckNames.includes(name)
    );
    const hasRequiredFailure = candidate.blockingRequiredCheckNames.some((name) =>
      candidate.failedOrErrorCheckNames.includes(name)
    );

    if (
      hasRequiredFailure ||
      hasRequiredSkipped ||
      candidate.summary.requiredOutcome === "failed"
    ) {
      return "required_checks_failed";
    }

    if (hasRequiredPending || candidate.summary.requiredOutcome === "pending") {
      return "required_checks_pending";
    }

    return "required_checks_failed";
  }

  return "verification_incomplete";
}

function promotionAuditCandidateArraysEqual(
  left: readonly AttemptPromotionAuditCandidate[] | unknown,
  right: readonly AttemptPromotionAuditCandidate[]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((candidate, index) =>
      promotionAuditCandidatesEqual(
        candidate as AttemptPromotionAuditCandidate | undefined,
        right[index]
      )
    )
  );
}

function promotionAuditCandidatesEqual(
  left: AttemptPromotionAuditCandidate | undefined,
  right: AttemptPromotionAuditCandidate | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }

  return (
    left.attemptId === right.attemptId &&
    left.runtime === right.runtime &&
    left.status === right.status &&
    left.sourceKind === right.sourceKind &&
    left.recommendedForPromotion === right.recommendedForPromotion &&
    summariesEqual(left.summary, right.summary) &&
    stringArraysEqual(
      left.blockingRequiredCheckNames,
      right.blockingRequiredCheckNames
    ) &&
    stringArraysEqual(
      left.failedOrErrorCheckNames,
      right.failedOrErrorCheckNames
    ) &&
    stringArraysEqual(left.pendingCheckNames, right.pendingCheckNames) &&
    stringArraysEqual(left.skippedCheckNames, right.skippedCheckNames)
  );
}

function summariesEqual(
  left: AttemptVerificationSummary,
  right: AttemptVerificationSummary
): boolean {
  return (
    left.sourceState === right.sourceState &&
    left.overallOutcome === right.overallOutcome &&
    left.requiredOutcome === right.requiredOutcome &&
    countsEqual(left.counts, right.counts) &&
    left.hasInvalidChecks === right.hasInvalidChecks &&
    left.hasComparablePayload === right.hasComparablePayload &&
    left.isSelectionReady === right.isSelectionReady
  );
}

function validateAttemptVerificationSummary(summary: unknown): void {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary to be an object."
    );
  }

  if (typeof summary.sourceState !== "string") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.sourceState to be a string."
    );
  }

  if (
    typeof summary.overallOutcome !== "string" ||
    !validVerificationOverallOutcomes.has(summary.overallOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.overallOutcome to use the existing verification overall-outcome vocabulary."
    );
  }

  if (
    typeof summary.requiredOutcome !== "string" ||
    !validVerificationRequiredOutcomes.has(summary.requiredOutcome)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.requiredOutcome to use the existing verification required-outcome vocabulary."
    );
  }

  if (typeof summary.hasInvalidChecks !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.hasInvalidChecks to be a boolean."
    );
  }

  if (typeof summary.hasComparablePayload !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.hasComparablePayload to be a boolean."
    );
  }

  if (typeof summary.isSelectionReady !== "boolean") {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.isSelectionReady to be a boolean."
    );
  }

  validateVerificationCounts(summary.counts);
}

function normalizeAttemptVerificationSummarySnapshot(
  summary: unknown,
  readableObjectMessage: string
): AttemptVerificationSummary {
  if (!isRecord(summary)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary to be an object."
    );
  }

  return {
    sourceState: accessSelectionValue(summary, "sourceState") as AttemptVerificationSummary["sourceState"],
    overallOutcome: accessSelectionValue(summary, "overallOutcome") as AttemptVerificationSummary["overallOutcome"],
    requiredOutcome: accessSelectionValue(summary, "requiredOutcome") as AttemptVerificationSummary["requiredOutcome"],
    counts: normalizeVerificationCountsSnapshot(
      accessSelectionValue(summary, "counts"),
      readableObjectMessage
    ),
    hasInvalidChecks: accessSelectionValue(summary, "hasInvalidChecks") as AttemptVerificationSummary["hasInvalidChecks"],
    hasComparablePayload: accessSelectionValue(summary, "hasComparablePayload") as AttemptVerificationSummary["hasComparablePayload"],
    isSelectionReady: accessSelectionValue(summary, "isSelectionReady") as AttemptVerificationSummary["isSelectionReady"]
  };
}

function normalizeVerificationCountsSnapshot(
  counts: unknown,
  _readableObjectMessage: string
): AttemptVerificationCounts {
  if (!isRecord(counts)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.counts to be an object."
    );
  }

  return {
    total: accessSelectionValue(counts, "total") as number,
    valid: accessSelectionValue(counts, "valid") as number,
    invalid: accessSelectionValue(counts, "invalid") as number,
    required: accessSelectionValue(counts, "required") as number,
    optional: accessSelectionValue(counts, "optional") as number,
    passed: accessSelectionValue(counts, "passed") as number,
    failed: accessSelectionValue(counts, "failed") as number,
    pending: accessSelectionValue(counts, "pending") as number,
    skipped: accessSelectionValue(counts, "skipped") as number,
    error: accessSelectionValue(counts, "error") as number
  };
}

function validateVerificationCounts(counts: unknown): void {
  if (!isRecord(counts)) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.counts to be an object."
    );
  }

  const values = [
    counts.total,
    counts.valid,
    counts.invalid,
    counts.required,
    counts.optional,
    counts.passed,
    counts.failed,
    counts.pending,
    counts.skipped,
    counts.error
  ];

  if (
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isInteger(value) || value < 0
    )
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.summary.counts to use non-negative integer values."
    );
  }
}

function validateCheckNameList(
  values: readonly string[],
  fieldName: string
): void {
  if (!Array.isArray(values)) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to be an array of non-empty strings.`
    );
  }

  if (
    values.some(
      (value) => typeof value !== "string" || value.trim().length === 0
    )
  ) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to use non-empty string entries.`
    );
  }
}

function normalizeCheckNameList(
  value: unknown,
  fieldName: string
): string[] {
  return normalizeSelectionTrimmedStringArray(
    value,
    `Attempt promotion explanation summary requires ${fieldName} to be an array of non-empty strings.`,
    `Attempt promotion explanation summary requires ${fieldName} to use non-empty string entries.`,
    `Attempt promotion explanation summary requires ${fieldName} to use trimmed non-empty string entries.`
  );
}

function validateNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(
      `Attempt promotion explanation summary requires ${fieldName} to be a non-empty string.`
    );
  }

  return value.trim();
}

function validateAttemptStatus(value: unknown): void {
  if (
    typeof value !== "string" ||
    !validAttemptStatuses.has(value as AttemptStatus)
  ) {
    throw new ValidationError(
      "Attempt promotion explanation summary requires candidate.status to use the existing attempt status vocabulary."
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
      "Attempt promotion explanation summary requires candidate.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  }
}

function countsEqual(
  left: AttemptVerificationCounts,
  right: AttemptVerificationCounts
): boolean {
  return (
    left.total === right.total &&
    left.valid === right.valid &&
    left.invalid === right.invalid &&
    left.required === right.required &&
    left.optional === right.optional &&
    left.passed === right.passed &&
    left.failed === right.failed &&
    left.pending === right.pending &&
    left.skipped === right.skipped &&
    left.error === right.error
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}
