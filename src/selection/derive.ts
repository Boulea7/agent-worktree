import { ValidationError } from "../core/errors.js";
import type { AttemptManifest } from "../manifest/types.js";
import {
  compareAttemptVerificationCandidates
} from "../verification/compare.js";
import { deriveAttemptVerificationSummary } from "../verification/derive.js";
import type {
  AttemptSelectionCandidate,
  AttemptSelectionResult
} from "./types.js";

const ATTEMPT_SELECTION_BASIS = "verification_summary" as const;

export function deriveAttemptSelectionCandidate(
  manifest: AttemptManifest
): AttemptSelectionCandidate {
  return {
    attemptId: manifest.attemptId,
    taskId: manifest.taskId,
    runtime: manifest.runtime,
    status: manifest.status,
    sourceKind: manifest.sourceKind,
    summary: deriveAttemptVerificationSummary(manifest.verification)
  };
}

export function deriveAttemptSelectionResult(
  manifests: readonly AttemptManifest[]
): AttemptSelectionResult {
  const firstManifest = manifests[0];

  if (firstManifest === undefined) {
    return {
      selectionBasis: ATTEMPT_SELECTION_BASIS,
      taskId: undefined,
      candidates: [],
      selected: undefined,
      comparableCandidateCount: 0,
      selectionReadyCandidateCount: 0,
      recommendedForPromotion: false
    };
  }

  const taskId = firstManifest.taskId;
  validateTaskBoundary(manifests, taskId);

  const candidates = manifests.map((manifest) =>
    deriveAttemptSelectionCandidate(manifest)
  );
  const sortedCandidates = [...candidates].sort(
    compareAttemptVerificationCandidates
  );
  const selected = sortedCandidates[0];
  const comparableCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.summary.hasComparablePayload
  ).length;
  const selectionReadyCandidateCount = sortedCandidates.filter(
    (candidate) => candidate.summary.isSelectionReady
  ).length;

  return {
    selectionBasis: ATTEMPT_SELECTION_BASIS,
    taskId,
    candidates: sortedCandidates,
    selected,
    comparableCandidateCount,
    selectionReadyCandidateCount,
    recommendedForPromotion: selected?.summary.isSelectionReady ?? false
  };
}

function validateTaskBoundary(
  manifests: readonly AttemptManifest[],
  taskId: string
): void {
  for (const manifest of manifests) {
    if (manifest.taskId !== taskId) {
      throw new ValidationError(
        "Attempt selection requires manifests from a single taskId."
      );
    }
  }
}
