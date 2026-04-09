import type {
  AttemptVerificationCandidate,
  AttemptVerificationOverallOutcome,
  AttemptVerificationRequiredOutcome
} from "./types.js";

const requiredOutcomeRank: Record<AttemptVerificationRequiredOutcome, number> = {
  satisfied: 0,
  pending: 1,
  failed: 2,
  incomplete: 3
};

const overallOutcomeRank: Record<AttemptVerificationOverallOutcome, number> = {
  passed: 0,
  pending: 1,
  failed: 2,
  incomplete: 3
};

export function compareAttemptVerificationCandidates(
  left: AttemptVerificationCandidate,
  right: AttemptVerificationCandidate
): number {
  return (
    comparePreferredBoolean(
      left.summary.isSelectionReady,
      right.summary.isSelectionReady
    ) ||
    comparePreferredBoolean(
      left.summary.hasComparablePayload,
      right.summary.hasComparablePayload
    ) ||
    compareAscending(
      requiredOutcomeRank[left.summary.requiredOutcome],
      requiredOutcomeRank[right.summary.requiredOutcome]
    ) ||
    compareAscending(
      overallOutcomeRank[left.summary.overallOutcome],
      overallOutcomeRank[right.summary.overallOutcome]
    ) ||
    comparePreferredBoolean(
      hasRealNegativeEvidence(left),
      hasRealNegativeEvidence(right)
    ) ||
    compareAscending(
      left.summary.counts.failed + left.summary.counts.error,
      right.summary.counts.failed + right.summary.counts.error
    ) ||
    compareAscending(left.summary.counts.pending, right.summary.counts.pending) ||
    compareAscending(left.summary.counts.invalid, right.summary.counts.invalid) ||
    compareDescending(left.summary.counts.passed, right.summary.counts.passed) ||
    left.attemptId.localeCompare(right.attemptId)
  );
}

function comparePreferredBoolean(left: boolean, right: boolean): number {
  if (left === right) {
    return 0;
  }

  return left ? -1 : 1;
}

function compareAscending(left: number, right: number): number {
  return left - right;
}

function compareDescending(left: number, right: number): number {
  return right - left;
}

function hasRealNegativeEvidence(candidate: AttemptVerificationCandidate): boolean {
  return candidate.summary.counts.failed + candidate.summary.counts.error > 0;
}
